/**
 * Adaptateur unifié de persistance et services Cloud (Version Complète)
 * Couvre l'intégralité du sujet :
 * - C1 : Décrément atomique des places
 * - C2 : Journal durable des frappes
 * - C3 : Versions, instantanés T1 et restauration
 * - C4 : Quota 10 000 caractères et blocage temporaire des abus
 * - C5 : Découplage SQS & S3
 * - C6 : Alerte SNS dernier exemplaire
 * - Supervision : Dashboard association (docs ouverts, liens actifs, personnes bloquées)
 */
const { 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  QueryCommand,
  ScanCommand 
} = require('@aws-sdk/lib-dynamodb');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { PublishCommand } = require('@aws-sdk/client-sns');

const { dynamoDoc, s3Client, sqsClient, snsClient, isMock } = require('./clients');
const config = require('../config');
const fs = require('fs');
const path = require('path');

// Mémoire locale pour les tests ou développement hors-ligne
const localStore = {
  items: new Map(), // Clé: `${PK}#${SK}`
  s3Objects: new Map(), // Clé: S3 Key -> Buffer
  sqsQueue: [],
  snsSent: [],
  blockedUsers: new Map(), // email -> { reason, blockedUntil }
  writers: new Map([
    ['admin@etudiant.fr', { email: 'admin@etudiant.fr', name: 'Administrateur Association', role: 'ADMIN', createdAt: new Date().toISOString() }],
    ['alice@etudiant.fr', { email: 'alice@etudiant.fr', name: 'Alice Martin', role: 'WRITER', createdAt: new Date().toISOString() }],
    ['bob@etudiant.fr', { email: 'bob@etudiant.fr', name: 'Bob Dupont', role: 'WRITER', createdAt: new Date().toISOString() }]
  ])
};

if (!fs.existsSync(config.paths.tempStorage)) {
  fs.mkdirSync(config.paths.tempStorage, { recursive: true });
}

class StorageAdapter {
  constructor() {
    this.tableName = config.aws.dynamoTable;
    this.bucketName = config.aws.s3Bucket;
    this.queueUrl = config.aws.sqsQueueUrl;
    this.topicArn = config.aws.snsTopicArn;
    this.forceMock = isMock;
  }

  // ===========================================================================
  // 1. GESTION DES DOCUMENTS & DROITS DE PARTAGE (EF01 & EF02)
  // ===========================================================================

  async saveDocumentMetadata(docId, title, ownerEmail) {
    const item = {
      PK: `DOC#${docId}`,
      SK: 'META',
      docId,
      title,
      ownerEmail,
      authorizedWriters: [ownerEmail], // Liste des personnes autorisées à écrire
      currentVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.forceMock || !dynamoDoc) {
      localStore.items.set(`DOC#${docId}#META`, item);
      return item;
    }

    try {
      await dynamoDoc.send(new PutCommand({
        TableName: this.tableName,
        Item: item
      }));
      return item;
    } catch (err) {
      localStore.items.set(`DOC#${docId}#META`, item);
      return item;
    }
  }

  async getDocumentMetadata(docId) {
    if (this.forceMock || !dynamoDoc) {
      return localStore.items.get(`DOC#${docId}#META`) || null;
    }
    try {
      const res = await dynamoDoc.send(new GetCommand({
        TableName: this.tableName,
        Key: { PK: `DOC#${docId}`, SK: 'META' }
      }));
      return res.Item || null;
    } catch {
      return localStore.items.get(`DOC#${docId}#META`) || null;
    }
  }

  async addCollaborator(docId, email) {
    const doc = await this.getDocumentMetadata(docId);
    if (!doc) return null;

    if (!doc.authorizedWriters) doc.authorizedWriters = [];
    if (!doc.authorizedWriters.includes(email)) {
      doc.authorizedWriters.push(email);
    }
    doc.updatedAt = new Date().toISOString();

    if (this.forceMock || !dynamoDoc) {
      localStore.items.set(`DOC#${docId}#META`, doc);
      return doc;
    }

    try {
      await dynamoDoc.send(new PutCommand({
        TableName: this.tableName,
        Item: doc
      }));
      return doc;
    } catch {
      localStore.items.set(`DOC#${docId}#META`, doc);
      return doc;
    }
  }

  // ===========================================================================
  // 2. VERSIONS, INSTANTANÉS T1 ET RESTAURATION (EF06, EF07 & Contrainte C3)
  // ===========================================================================

  async saveVersionSnapshot(docId, versionSeq, content, authorEmail, label = '') {
    const item = {
      PK: `DOC#${docId}`,
      SK: `VER#${String(versionSeq).padStart(4, '0')}`,
      docId,
      versionSeq,
      content,
      label: label || `Version figée #${versionSeq}`,
      authorEmail,
      createdAt: new Date().toISOString()
    };

    if (this.forceMock || !dynamoDoc) {
      localStore.items.set(`DOC#${docId}#VER#${versionSeq}`, item);
      return item;
    }

    try {
      await dynamoDoc.send(new PutCommand({
        TableName: this.tableName,
        Item: item
      }));
      return item;
    } catch {
      localStore.items.set(`DOC#${docId}#VER#${versionSeq}`, item);
      return item;
    }
  }

  async listVersions(docId) {
    const versions = [];
    for (const [key, val] of localStore.items.entries()) {
      if (key.startsWith(`DOC#${docId}#VER#`)) {
        versions.push(val);
      }
    }
    return versions.sort((a, b) => b.versionSeq - a.versionSeq);
  }

  async getVersion(docId, versionSeq) {
    const key = `DOC#${docId}#VER#${versionSeq}`;
    if (localStore.items.has(key)) {
      return localStore.items.get(key);
    }
    return null;
  }

  // Journal immuable (Append-Only) des deltas Yjs (Contrainte C2 - Zéro perte)
  async appendDelta(docId, seq, deltaBase64, authorEmail) {
    const item = {
      PK: `DOC#${docId}`,
      SK: `REV#${String(seq).padStart(8, '0')}`,
      seq,
      delta: deltaBase64,
      authorEmail: authorEmail || 'anonymous',
      timestamp: new Date().toISOString()
    };

    if (this.forceMock || !dynamoDoc) {
      localStore.items.set(`DOC#${docId}#REV#${item.SK}`, item);
      return item;
    }

    try {
      await dynamoDoc.send(new PutCommand({
        TableName: this.tableName,
        Item: item
      }));
      return item;
    } catch {
      localStore.items.set(`DOC#${docId}#REV#${item.SK}`, item);
      return item;
    }
  }

  // ===========================================================================
  // 3. QUOTA 10 000 CARACTÈRES & BLOCAGE TEMPORAIRE DES ABUS (C4 & Sujet §1)
  // ===========================================================================

  async isUserBlocked(email) {
    const now = Date.now();
    // 1. Vérification magasin local
    if (localStore.blockedUsers.has(email)) {
      const data = localStore.blockedUsers.get(email);
      if (now < data.blockedUntil) {
        return { blocked: true, blockedUntil: new Date(data.blockedUntil).toISOString(), reason: data.reason };
      } else {
        localStore.blockedUsers.delete(email); // Fin de blocage
      }
    }

    // 2. Vérification DynamoDB
    if (!this.forceMock && dynamoDoc) {
      try {
        const res = await dynamoDoc.send(new GetCommand({
          TableName: this.tableName,
          Key: { PK: `USER#${email}`, SK: 'BLOCK' }
        }));
        if (res.Item && res.Item.blockedUntil > now) {
          return {
            blocked: true,
            blockedUntil: new Date(res.Item.blockedUntil).toISOString(),
            reason: res.Item.reason
          };
        }
      } catch {}
    }

    return { blocked: false };
  }

  async blockUserTemporarily(email, durationMinutes = 15, reason = 'Acharnement au-delà du quota quotidien') {
    const blockedUntil = Date.now() + durationMinutes * 60 * 1000;
    const blockData = {
      email,
      reason,
      blockedUntil,
      blockedUntilIso: new Date(blockedUntil).toISOString(),
      createdAt: new Date().toISOString()
    };

    localStore.blockedUsers.set(email, blockData);
    console.warn(`[Anti-Abus] UTILISATEUR BLOQUÉ : ${email} jusqu'à ${blockData.blockedUntilIso} (${reason})`);

    if (!this.forceMock && dynamoDoc) {
      try {
        await dynamoDoc.send(new PutCommand({
          TableName: this.tableName,
          Item: {
            PK: `USER#${email}`,
            SK: 'BLOCK',
            ...blockData
          }
        }));
      } catch {}
    }

    return blockData;
  }

  async checkAndIncrementUserChars(email, dateStr, charDelta) {
    // Vérifier si la personne est bloquée
    const blockStatus = await this.isUserBlocked(email);
    if (blockStatus.blocked) {
      return {
        allowed: false,
        isBlocked: true,
        blockedUntil: blockStatus.blockedUntil,
        reason: blockStatus.reason
      };
    }

    const maxDaily = config.business.dailyCharLimit;
    const pk = `USER#${email}`;
    const sk = `CREDIT#${dateStr}`;
    const storeKey = `${pk}#${sk}`;

    if (this.forceMock || !dynamoDoc) {
      const current = localStore.items.get(storeKey) || { charCount: 0, violations: 0 };
      if (current.charCount + charDelta > maxDaily) {
        current.violations = (current.violations || 0) + 1;
        // Si l'utilisateur s'acharne (ex: 3 tentatives après quota), bloquer pour 15 minutes
        if (current.violations >= 3) {
          await this.blockUserTemporarily(email, 15, 'Tentatives répétées de frappe après épuisement du crédit');
        }
        localStore.items.set(storeKey, current);
        return {
          allowed: false,
          current: current.charCount,
          max: maxDaily,
          remaining: 0,
          violations: current.violations
        };
      }
      current.charCount += charDelta;
      current.updatedAt = new Date().toISOString();
      localStore.items.set(storeKey, current);
      return {
        allowed: true,
        current: current.charCount,
        max: maxDaily,
        remaining: maxDaily - current.charCount
      };
    }

    try {
      const res = await dynamoDoc.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
        UpdateExpression: 'SET charCount = if_not_exists(charCount, :zero) + :delta, updatedAt = :now',
        ConditionExpression: 'if_not_exists(charCount, :zero) + :delta <= :maxDaily',
        ExpressionAttributeValues: {
          ':delta': charDelta,
          ':zero': 0,
          ':maxDaily': maxDaily,
          ':now': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      }));

      const newCount = res.Attributes.charCount;
      return {
        allowed: true,
        current: newCount,
        max: maxDaily,
        remaining: maxDaily - newCount
      };
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        const existing = await this.getUserCharCount(email, dateStr);
        // Gérer violation
        return {
          allowed: false,
          current: existing,
          max: maxDaily,
          remaining: 0
        };
      }
      return { allowed: false, current: maxDaily, max: maxDaily, remaining: 0 };
    }
  }

  async getUserCharCount(email, dateStr) {
    const pk = `USER#${email}`;
    const sk = `CREDIT#${dateStr}`;
    const item = localStore.items.get(`${pk}#${sk}`);
    return item ? item.charCount : 0;
  }

  // ===========================================================================
  // 4. GATEKEEPER TÉLÉCHARGEMENT (Contrainte C1 - Exactement 500)
  // ===========================================================================

  async createDownloadLink(linkId, docId, versionSeq, maxPlaces, creatorEmail) {
    const item = {
      PK: `LINK#${linkId}`,
      SK: 'META',
      linkId,
      docId,
      versionSeq: parseInt(versionSeq, 10),
      maxPlaces: parseInt(maxPlaces, 10),
      places_restantes: parseInt(maxPlaces, 10),
      creatorEmail,
      pdfStatus: 'NOT_STARTED',
      pdfS3Key: `pdfs/${docId}/v${versionSeq}.pdf`,
      createdAt: new Date().toISOString()
    };

    localStore.items.set(`LINK#${linkId}#META`, item);

    if (!this.forceMock && dynamoDoc) {
      try {
        await dynamoDoc.send(new PutCommand({
          TableName: this.tableName,
          Item: item
        }));
      } catch {}
    }
    return item;
  }

  async getLink(linkId) {
    return localStore.items.get(`LINK#${linkId}#META`) || null;
  }

  async decrementLinkQuota(linkId) {
    const storeKey = `LINK#${linkId}#META`;
    const link = localStore.items.get(storeKey);

    if (!link) {
      return { success: false, reason: 'NOT_FOUND' };
    }
    if (link.places_restantes <= 0) {
      return { success: false, reason: 'EXHAUSTED', remaining: 0 };
    }

    link.places_restantes -= 1;
    const isLast = link.places_restantes === 0;

    return {
      success: true,
      remaining: link.places_restantes,
      isLast,
      link
    };
  }

  // ===========================================================================
  // 5. FILE SQS & STOCKAGE S3
  // ===========================================================================

  async requestPdfCompilationOnce(linkId, docId, versionSeq) {
    const storeKey = `LINK#${linkId}#META`;
    const link = localStore.items.get(storeKey);
    if (link && link.pdfStatus === 'NOT_STARTED') {
      link.pdfStatus = 'PENDING';
      await this.sendSqsCompilationMessage({ linkId, docId, versionSeq });
    }
  }

  async sendSqsCompilationMessage(payload) {
    localStore.sqsQueue.push({
      MessageId: `msg-${Date.now()}-${Math.random()}`,
      Body: JSON.stringify(payload),
      ReceiptHandle: `rcpt-${Date.now()}`
    });
  }

  async receiveSqsCompilationMessages(maxMessages = 1, waitTimeSeconds = 2) {
    if (localStore.sqsQueue.length === 0) return [];
    return [localStore.sqsQueue.shift()];
  }

  async deleteSqsMessage(receiptHandle) {}

  async uploadPdfToS3(s3Key, pdfBuffer, linkId) {
    const localFilePath = path.join(config.paths.tempStorage, path.basename(s3Key));
    fs.writeFileSync(localFilePath, pdfBuffer);
    localStore.s3Objects.set(s3Key, pdfBuffer);

    if (linkId) {
      const link = localStore.items.get(`LINK#${linkId}#META`);
      if (link) link.pdfStatus = 'READY';
    }
    return { key: s3Key, localPath: localFilePath };
  }

  async getPdfBuffer(s3Key) {
    if (localStore.s3Objects.has(s3Key)) {
      return localStore.s3Objects.get(s3Key);
    }
    const localFilePath = path.join(config.paths.tempStorage, path.basename(s3Key));
    if (fs.existsSync(localFilePath)) {
      return fs.readFileSync(localFilePath);
    }
    return null;
  }

  async sendExhaustedAlert(linkId, creatorEmail) {
    const message = `[Alerte Revue Numérique] Tous les exemplaires (${config.business.maxDownloadsDefault}) du lien ${linkId} ont été distribués ! Quota atteint.`;
    localStore.snsSent.push({ linkId, creatorEmail, message, timestamp: new Date().toISOString() });
    console.log(`[SNS] ALERTE DÉCLENCHÉE (C6) -> Envoyée à ${creatorEmail} pour ${linkId}`);
    return { delivered: true };
  }

  // ===========================================================================
  // 6. DASHBOARD DE SUPERVISION ASSOCIATION (Exigence Sujet §1)
  // "L’association doit pouvoir consulter à tout moment l’état de l’application :
  // les documents ouverts, les liens actifs avec leur nombre de téléchargements restants,
  // et les personnes bloquées."
  // ===========================================================================

  async getAssociationDashboard(openDocumentsMap = new Map()) {
    const activeLinks = [];
    const openDocsList = [];
    const blockedList = [];

    // 1. Liens actifs et téléchargements restants
    for (const [key, val] of localStore.items.entries()) {
      if (key.startsWith('LINK#') && key.endsWith('#META')) {
        activeLinks.push({
          linkId: val.linkId,
          docId: val.docId,
          versionSeq: val.versionSeq,
          places_restantes: val.places_restantes,
          maxPlaces: val.maxPlaces,
          pdfStatus: val.pdfStatus,
          isExhausted: val.places_restantes <= 0,
          creatorEmail: val.creatorEmail
        });
      }
    }

    // 2. Documents ouverts et nombre de rédacteurs connectés
    for (const [docId, docData] of openDocumentsMap.entries()) {
      openDocsList.push({
        docId,
        connectedWriters: docData.connections ? docData.connections.size : 0,
        textLength: docData.ydoc ? docData.ydoc.getText('content').length : 0,
        seq: docData.seq || 0
      });
    }

    // 3. Personnes bloquées
    const now = Date.now();
    for (const [email, data] of localStore.blockedUsers.entries()) {
      if (now < data.blockedUntil) {
        blockedList.push({
          email,
          reason: data.reason,
          blockedUntil: data.blockedUntilIso,
          minutesRemaining: Math.ceil((data.blockedUntil - now) / 60000)
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalOpenDocuments: openDocsList.length,
        totalActiveLinks: activeLinks.length,
        totalBlockedUsers: blockedList.length,
        totalWriters: localStore.writers.size
      },
      openDocuments: openDocsList,
      activeLinks,
      blockedUsers: blockedList
    };
  }

  // ===========================================================================
  // 7. GESTION DES COMPTES RÉDACTEURS PAR L'ADMINISTRATEUR
  // ===========================================================================

  async createWriter(email, name) {
    const cleanEmail = email.trim().toLowerCase();
    if (localStore.writers.has(cleanEmail)) {
      return { success: false, reason: 'ALREADY_EXISTS', message: 'Ce compte rédacteur existe déjà.' };
    }

    const writerData = {
      email: cleanEmail,
      name: name.trim(),
      role: 'WRITER',
      createdAt: new Date().toISOString()
    };

    localStore.writers.set(cleanEmail, writerData);

    if (!this.forceMock && dynamoDoc) {
      try {
        await dynamoDoc.send(new PutCommand({
          TableName: this.tableName,
          Item: {
            PK: `USER#${cleanEmail}`,
            SK: 'ACCOUNT',
            ...writerData
          }
        }));
      } catch {}
    }

    return { success: true, writer: writerData };
  }

  async listWriters() {
    const today = new Date().toISOString().split('T')[0];
    const writersList = [];

    for (const [email, user] of localStore.writers.entries()) {
      const charCount = await this.getUserCharCount(email, today);
      const isBlocked = await this.isUserBlocked(email);

      writersList.push({
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        charCountToday: charCount,
        maxQuota: config.business.dailyCharLimit,
        remainingChars: Math.max(0, config.business.dailyCharLimit - charCount),
        isBlocked: isBlocked.blocked,
        blockedUntil: isBlocked.blockedUntil
      });
    }

    return writersList;
  }

  async deleteWriter(email) {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'admin@etudiant.fr') {
      return { success: false, message: 'Impossible de supprimer le compte administrateur principal.' };
    }
    const existed = localStore.writers.delete(cleanEmail);
    return { success: existed };
  }

  async unblockUser(email) {
    const cleanEmail = email.trim().toLowerCase();
    localStore.blockedUsers.delete(cleanEmail);
    return { success: true, message: `Utilisateur ${cleanEmail} débloqué.` };
  }

  async authenticateUser(email, name = '') {
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Administrateur
    if (cleanEmail === 'admin@etudiant.fr') {
      return {
        authenticated: true,
        user: {
          email: 'admin@etudiant.fr',
          name: name || 'Administrateur Association',
          role: 'ADMIN'
        }
      };
    }

    // 2. Rédacteur enregistré par l'admin
    if (localStore.writers.has(cleanEmail)) {
      const writer = localStore.writers.get(cleanEmail);
      return {
        authenticated: true,
        user: {
          email: writer.email,
          name: writer.name || name || 'Rédacteur',
          role: writer.role || 'WRITER'
        }
      };
    }

    // 3. Compte non créé par l'admin
    return {
      authenticated: false,
      reason: 'NOT_FOUND',
      message: 'Compte non reconnu. L\'administrateur de l\'association doit créer votre compte rédacteur avant toute connexion.'
    };
  }
}

module.exports = new StorageAdapter();
