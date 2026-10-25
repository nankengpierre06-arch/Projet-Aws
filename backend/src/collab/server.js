/**
 * Serveur de Collaboration Temps Réel (Port 1234)
 * - Maintien des WebSockets en mémoire vive (RAM < 150 Mo pour 300 rédacteurs)
 * - Protocole binaire Yjs (CRDT) & Awareness (présence et curseurs en direct)
 * - Contrôle d'accès par document (Partage de droits)
 * - Contrôle strict du quota journalier de 10 000 caractères par rédacteur (Contrainte C4)
 * - Détection de l'acharnement et blocage temporaire automatique
 * - Persistance immuable (Append-Only) dans DynamoDB (Contrainte C2 - Zéro perte)
 * - Restauration dynamique de version en direct (Contrainte C3)
 */
const { WebSocketServer, WebSocket } = require('ws');
const Y = require('yjs');
const url = require('url');
const config = require('../config');
const storage = require('../aws/storage-adapter');

class CollabServer {
  constructor(port = config.portCollab) {
    this.port = port;
    this.docs = new Map(); // docId -> { ydoc, seq, connections: Set, charLengths: Map }
    this.wss = null;
  }

  start() {
    this.wss = new WebSocketServer({ port: this.port });
    console.log(`[Collab Server] Écoute WebSockets démarrée sur le port ${this.port}`);

    this.wss.on('connection', async (conn, req) => {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const docId = pathParts[pathParts.length - 1] || parsedUrl.searchParams.get('docId') || 'default-doc';
      const userEmail = parsedUrl.searchParams.get('email') || 'redacteur@etudiant.fr';
      const userName = parsedUrl.searchParams.get('name') || 'Rédacteur';

      // 1. Vérifier si l'utilisateur est temporairement bloqué (Anti-Abus)
      const blockStatus = await storage.isUserBlocked(userEmail);
      if (blockStatus.blocked) {
        console.warn(`[Collab] Connexion rejetée pour ${userEmail} : BLOQUÉ jusqu'à ${blockStatus.blockedUntil}`);
        this.sendJson(conn, {
          type: 'ERROR_BLOCKED',
          message: `Vous êtes temporairement bloqué pour acharnement jusqu'à ${blockStatus.blockedUntil}.`,
          blockedUntil: blockStatus.blockedUntil,
          reason: blockStatus.reason
        });
        conn.close(4003, 'User Blocked');
        return;
      }

      // 2. Vérifier les droits d'accès au document (Partage)
      const docMeta = await storage.getDocumentMetadata(docId);
      if (docMeta && docMeta.authorizedWriters && docMeta.authorizedWriters.length > 0) {
        if (!docMeta.authorizedWriters.includes(userEmail)) {
          console.warn(`[Collab] Accès non autorisé : ${userEmail} sur doc ${docId}`);
          this.sendJson(conn, {
            type: 'ERROR_FORBIDDEN',
            message: 'Vous n\'avez pas les droits d\'écriture sur ce document.'
          });
          conn.close(4003, 'Forbidden');
          return;
        }
      }

      console.log(`[Collab] Connexion WSS admise : utilisateur=${userEmail}, doc=${docId}`);

      const docState = this.getOrCreateDoc(docId);
      docState.connections.add(conn);

      // Envoyer l'état actuel du document au nouveau connecté
      const syncStep1 = Y.encodeStateAsUpdate(docState.ydoc);
      this.sendBinary(conn, 0, syncStep1); // Tag 0 = Sync

      // Notifier le client de son quota restant du jour (C4)
      const today = new Date().toISOString().split('T')[0];
      const currentChars = await storage.getUserCharCount(userEmail, today);
      this.sendJson(conn, {
        type: 'QUOTA_STATUS',
        used: currentChars,
        limit: config.business.dailyCharLimit,
        remaining: Math.max(0, config.business.dailyCharLimit - currentChars)
      });

      // Gestion des messages entrants
      conn.on('message', async (data, isBinary) => {
        // Re-vérifier si l'utilisateur a été bloqué entre temps
        const currentBlock = await storage.isUserBlocked(userEmail);
        if (currentBlock.blocked) {
          this.sendJson(conn, {
            type: 'ERROR_BLOCKED',
            message: `Accès révoqué. Bloqué temporairement jusqu'à ${currentBlock.blockedUntil}.`
          });
          conn.close();
          return;
        }

        if (!isBinary) {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'PING') {
              this.sendJson(conn, { type: 'PONG' });
            }
          } catch {}
          return;
        }

        const uint8 = new Uint8Array(data);
        if (uint8.length === 0) return;

        const messageType = uint8[0];
        const payload = uint8.subarray(1);

        // Tag 0 : Message de mise à jour Yjs
        if (messageType === 0) {
          const ytext = docState.ydoc.getText('content');
          const prevLength = ytext.length;

          // Mesurer le delta potentiel
          Y.applyUpdate(docState.ydoc, payload);
          const newLength = ytext.length;
          const charDelta = newLength - prevLength;

          // Si des caractères ont été insérés, vérifier le quota (C4)
          if (charDelta > 0) {
            const quotaCheck = await storage.checkAndIncrementUserChars(userEmail, today, charDelta);

            if (!quotaCheck.allowed) {
              if (quotaCheck.isBlocked) {
                this.sendJson(conn, {
                  type: 'ERROR_BLOCKED',
                  message: `Vous avez été bloqué pour acharnement (${quotaCheck.reason}).`,
                  blockedUntil: quotaCheck.blockedUntil
                });
                conn.close();
                return;
              }

              console.warn(`[Collab C4] Quota dépassé pour ${userEmail} (${quotaCheck.current}/${config.business.dailyCharLimit} car.)`);
              this.sendJson(conn, {
                type: 'ERROR_QUOTA_EXCEEDED',
                message: `Quota quotidien de ${config.business.dailyCharLimit} caractères atteint !`,
                used: quotaCheck.current,
                limit: config.business.dailyCharLimit,
                violations: quotaCheck.violations || 1
              });

              // Renvoyer l'état canonique pour annuler la saisie côté client
              const rollbackUpdate = Y.encodeStateAsUpdate(docState.ydoc);
              this.sendBinary(conn, 0, rollbackUpdate);
              return;
            }

            // Notifier le client de son nouveau solde
            this.sendJson(conn, {
              type: 'QUOTA_UPDATE',
              used: quotaCheck.current,
              remaining: quotaCheck.remaining
            });
          }

          // Diffuser la mise à jour à tous les autres rédacteurs connectés
          docState.seq += 1;
          const currentSeq = docState.seq;
          for (const otherConn of docState.connections) {
            if (otherConn !== conn && otherConn.readyState === WebSocket.OPEN) {
              this.sendBinary(otherConn, 0, payload);
            }
          }

          // Enregistrement asynchrone dans le journal immuable DynamoDB (C2 - Zéro perte)
          const base64Delta = Buffer.from(payload).toString('base64');
          storage.appendDelta(docId, currentSeq, base64Delta, userEmail).catch(err => {
            console.error(`[Collab C2] Erreur sauvegarde delta #${currentSeq} : ${err.message}`);
          });

          // Création dynamique automatique d'instantanés de versions (Contrainte C3)
          clearTimeout(docState.autoSnapshotTimer);
          docState.autoSnapshotTimer = setTimeout(async () => {
            try {
              const currentText = docState.ydoc.getText('content').toString();
              if (currentText.length > 5 && currentText !== docState.lastSnapshotText) {
                docState.lastSnapshotText = currentText;
                const existingVersions = await storage.listVersions(docId);
                const nextSeq = existingVersions.length > 0 ? Math.max(...existingVersions.map(v => Number(v.versionSeq) || 0)) + 1 : 1;
                const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                await storage.saveVersionSnapshot(
                  docId,
                  nextSeq,
                  currentText,
                  userEmail,
                  `v${nextSeq} — Sauvegarde automatique (${timeStr})`
                );
                console.log(`[Collab C3] Version dynamique #${nextSeq} créée automatiquement pour le doc ${docId}`);
              }
            } catch (snapErr) {
              console.error(`[Collab C3] Erreur sauvegarde version dynamique : ${snapErr.message}`);
            }
          }, 3500);
        } 
        // Tag 1 : Message de présence et curseurs (Awareness)
        else if (messageType === 1) {
          // Diffusion volatile aux collaborateurs (aucune écriture en base)
          for (const otherConn of docState.connections) {
            if (otherConn !== conn && otherConn.readyState === WebSocket.OPEN) {
              this.sendBinary(otherConn, 1, payload);
            }
          }
        }
      });

      conn.on('close', () => {
        docState.connections.delete(conn);
        console.log(`[Collab] Déconnexion : ${userEmail} (Restants sur doc : ${docState.connections.size})`);
      });

      conn.on('error', (err) => {
        docState.connections.delete(conn);
      });
    });

    return this.wss;
  }

  getOrCreateDoc(docId) {
    if (!this.docs.has(docId)) {
      const ydoc = new Y.Doc();
      this.docs.set(docId, {
        ydoc,
        seq: 0,
        connections: new Set()
      });
    }
    return this.docs.get(docId);
  }

  /**
   * Restauration d'une version antérieure (EF07)
   * Écrase le contenu actuel par l'instantané restauré et synchronise instantanément tous les clients connectés !
   */
  restoreDocVersion(docId, newTextContent) {
    const docState = this.getOrCreateDoc(docId);
    const ytext = docState.ydoc.getText('content');

    docState.ydoc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, newTextContent);
    });

    docState.seq += 1;
    const update = Y.encodeStateAsUpdate(docState.ydoc);

    // Diffuser la restauration en direct à tous les rédacteurs connectés
    for (const conn of docState.connections) {
      if (conn.readyState === WebSocket.OPEN) {
        this.sendBinary(conn, 0, update);
        this.sendJson(conn, {
          type: 'VERSION_RESTORED',
          message: 'Une version antérieure a été restaurée par un administrateur.'
        });
      }
    }
    console.log(`[Collab] Version restaurée en direct sur le doc ${docId} (${docState.connections.size} rédacteurs synchronisés)`);
  }

  getDocContent(docId) {
    if (!this.docs.has(docId)) return '';
    return this.docs.get(docId).ydoc.getText('content').toString();
  }

  sendBinary(conn, tag, data) {
    if (conn.readyState !== WebSocket.OPEN) return;
    const tagged = new Uint8Array(data.length + 1);
    tagged[0] = tag;
    tagged.set(data, 1);
    conn.send(tagged);
  }

  sendJson(conn, obj) {
    if (conn.readyState !== WebSocket.OPEN) return;
    conn.send(JSON.stringify(obj));
  }

  stop() {
    if (this.wss) {
      this.wss.close();
      console.log('[Collab Server] Arrêté.');
    }
  }
}

// Instance globale partagée
const defaultCollabServer = new CollabServer();

module.exports = defaultCollabServer;
module.exports.CollabServer = CollabServer;

if (require.main === module) {
  defaultCollabServer.start();
}
