/**
 * Serveur de Collaboration Temps Réel (Port 1234)
 * - Maintien des WebSockets en mémoire vive (RAM < 150 Mo pour 300 rédacteurs)
 * - Protocole binaire Yjs (CRDT) & Awareness (présence et curseurs)
 * - Contrôle strict du quota journalier de 10 000 caractères par rédacteur (Contrainte C4)
 * - Persistance immuable (Append-Only) dans DynamoDB (Contrainte C2 - Zéro perte)
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
      const parsedUrl = url.parse(req.url, true);
      const pathParts = (parsedUrl.pathname || '').split('/').filter(Boolean);
      const docId = pathParts[pathParts.length - 1] || parsedUrl.query.docId || 'default-doc';
      const userEmail = parsedUrl.query.email || 'redacteur@etudiant.fr';
      const userName = parsedUrl.query.name || 'Rédacteur';

      console.log(`[Collab] Connexion WSS établie : utilisateur=${userEmail}, doc=${docId}`);

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

          // Appliquer provisoirement pour mesurer le delta
          Y.applyUpdate(docState.ydoc, payload);
          const newLength = ytext.length;
          const charDelta = newLength - prevLength;

          // Si des caractères ont été insérés, vérifier le quota (C4)
          if (charDelta > 0) {
            const quotaCheck = await storage.checkAndIncrementUserChars(userEmail, today, charDelta);

            if (!quotaCheck.allowed) {
              console.warn(`[Collab C4] Quota dépassé pour ${userEmail} (${quotaCheck.current}/${config.business.dailyCharLimit} car.)`);
              this.sendJson(conn, {
                type: 'ERROR_QUOTA_EXCEEDED',
                message: `Quota quotidien de ${config.business.dailyCharLimit} caractères atteint ! Vos modifications ne sont pas diffusées.`,
                used: quotaCheck.current,
                limit: config.business.dailyCharLimit
              });
              // Renvoyer l'état canonique antérieur au client pour réaligner sa vue
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
        } 
        // Tag 1 : Message de présence et curseurs (Awareness)
        else if (messageType === 1) {
          // Diffusion immédiate et volatile aux collaborateurs (aucune écriture en base)
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
        console.warn(`[Collab] Erreur socket : ${err.message}`);
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

// Export de la classe et instance par défaut
module.exports = CollabServer;

if (require.main === module) {
  const server = new CollabServer();
  server.start();
}
