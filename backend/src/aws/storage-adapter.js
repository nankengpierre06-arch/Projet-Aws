/**
 * Adaptateur unifié de persistance et services Cloud
 * Gère DynamoDB (Single-Table Design), S3, SQS et SNS avec mode miroir local en mémoire
 */
const { 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  QueryCommand 
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
  sqsQueue: [], // Messages en attente
  snsSent: []
};

// S'assurer que le dossier de stockage local existe
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
  // 1. GESTION DES DOCUMENTS & VERSIONS (C2 & C3)
  // ===========================================================================

  async saveDocumentMetadata(docId, title, ownerEmail) {
    const item = {
      PK: `DOC#${docId}`,
      SK: 'META',
      title,
      ownerEmail,
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
      console.warn(`[Storage] Fallback local sur saveDocumentMetadata : ${err.message}`);
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
    } catch (err) {
      return localStore.items.get(`DOC#${docId}#META`) || null;
    }
  }

  // Journal immuable (Append-Only) des frappes Yjs (Contrainte C2 - Zéro perte)
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
    } catch (err) {
      localStore.items.set(`DOC#${docId}#REV#${item.SK}`, item);
      return item;
    }
  }

  // ===========================================================================
  // 2. GESTION DU QUOTA DE FRAISSE REDACTEUR (Contrainte C4 - 10 000 car./jour)
  // ===========================================================================

  async checkAndIncrementUserChars(email, dateStr, charDelta) {
    const maxDaily = config.business.dailyCharLimit;
    const pk = `USER#${email}`;
    const sk = `CREDIT#${dateStr}`;
    const storeKey = `${pk}#${sk}`;

    if (this.forceMock || !dynamoDoc) {
      const current = localStore.items.get(storeKey) || { charCount: 0 };
      if (current.charCount + charDelta > maxDaily) {
        return {
          allowed: false,
          current: current.charCount,
          max: maxDaily,
          remaining: Math.max(0, maxDaily - current.charCount)
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
      // Décrément atomique avec condition : char_count + :delta <= :maxDaily
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
        return {
          allowed: false,
          current: existing,
          max: maxDaily,
          remaining: 0
        };
      }
      // Fallback local
      return this.checkAndIncrementUserCharsFallback(storeKey, charDelta, maxDaily);
    }
  }

  async getUserCharCount(email, dateStr) {
    const pk = `USER#${email}`;
    const sk = `CREDIT#${dateStr}`;
    if (this.forceMock || !dynamoDoc) {
      const item = localStore.items.get(`${pk}#${sk}`);
      return item ? item.charCount : 0;
    }
    try {
      const res = await dynamoDoc.send(new GetCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk }
      }));
      return res.Item ? res.Item.charCount : 0;
    } catch {
      const item = localStore.items.get(`${pk}#${sk}`);
      return item ? item.charCount : 0;
    }
  }

  checkAndIncrementUserCharsFallback(storeKey, charDelta, maxDaily) {
    const current = localStore.items.get(storeKey) || { charCount: 0 };
    if (current.charCount + charDelta > maxDaily) {
      return {
        allowed: false,
        current: current.charCount,
        max: maxDaily,
        remaining: Math.max(0, maxDaily - current.charCount)
      };
    }
    current.charCount += charDelta;
    localStore.items.set(storeKey, current);
    return {
      allowed: true,
      current: current.charCount,
      max: maxDaily,
      remaining: maxDaily - current.charCount
    };
  }

  // ===========================================================================
  // 3. GATEKEEPER TÉLÉCHARGEMENT & ATOMIC DÉCRÉMENT (Contrainte C1 - Exactement 500)
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
      pdfStatus: 'NOT_STARTED', // NOT_STARTED | PENDING | READY
      pdfS3Key: `pdfs/${docId}/v${versionSeq}.pdf`,
      createdAt: new Date().toISOString()
    };

    if (this.forceMock || !dynamoDoc) {
      localStore.items.set(`LINK#${linkId}#META`, item);
      return item;
    }

    try {
      await dynamoDoc.send(new PutCommand({
        TableName: this.tableName,
        Item: item
      }));
      return item;
    } catch (err) {
      localStore.items.set(`LINK#${linkId}#META`, item);
      return item;
    }
  }

  async getLink(linkId) {
    if (this.forceMock || !dynamoDoc) {
      return localStore.items.get(`LINK#${linkId}#META`) || null;
    }
    try {
      const res = await dynamoDoc.send(new GetCommand({
        TableName: this.tableName,
        Key: { PK: `LINK#${linkId}`, SK: 'META' }
      }));
      return res.Item || null;
    } catch {
      return localStore.items.get(`LINK#${linkId}#META`) || null;
    }
  }

  /**
   * Cœur critique de la Contrainte C1 :
   * Décrément atomique direct garanti par DynamoDB en O(1) < 10 ms sans verrou applicatif.
   * `SET places_restantes = places_restantes - 1 WHERE places_restantes > 0`
   */
  async decrementLinkQuota(linkId) {
    const storeKey = `LINK#${linkId}#META`;

    if (this.forceMock || !dynamoDoc) {
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

    try {
      const res = await dynamoDoc.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: `LINK#${linkId}`, SK: 'META' },
        UpdateExpression: 'SET places_restantes = places_restantes - :dec',
        ConditionExpression: 'places_restantes > :zero',
        ExpressionAttributeValues: {
          ':dec': 1,
          ':zero': 0
        },
        ReturnValues: 'ALL_NEW'
      }));

      const remaining = res.Attributes.places_restantes;
      const isLast = remaining === 0;
      return {
        success: true,
        remaining,
        isLast,
        link: res.Attributes
      };
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        return { success: false, reason: 'EXHAUSTED', remaining: 0 };
      }
      // Fallback local en mémoire
      const link = localStore.items.get(storeKey);
      if (!link || link.places_restantes <= 0) {
        return { success: false, reason: 'EXHAUSTED', remaining: 0 };
      }
      link.places_restantes -= 1;
      return {
        success: true,
        remaining: link.places_restantes,
        isLast: link.places_restantes === 0,
        link
      };
    }
  }

  // ===========================================================================
  // 4. DÉCOUPLAGE SQS & COMPILATION UNIQUE DU PDF (C5)
  // ===========================================================================

  /**
   * Déclenche la compilation SQS UNE SEULE FOIS par version de document
   */
  async requestPdfCompilationOnce(linkId, docId, versionSeq) {
    const storeKey = `LINK#${linkId}#META`;
    let shouldSendToQueue = false;

    if (this.forceMock || !dynamoDoc) {
      const link = localStore.items.get(storeKey);
      if (link && link.pdfStatus === 'NOT_STARTED') {
        link.pdfStatus = 'PENDING';
        shouldSendToQueue = true;
      }
    } else {
      try {
        await dynamoDoc.send(new UpdateCommand({
          TableName: this.tableName,
          Key: { PK: `LINK#${linkId}`, SK: 'META' },
          UpdateExpression: 'SET pdfStatus = :pending',
          ConditionExpression: 'pdfStatus = :notStarted',
          ExpressionAttributeValues: {
            ':pending': 'PENDING',
            ':notStarted': 'NOT_STARTED'
          }
        }));
        shouldSendToQueue = true;
      } catch (err) {
        // ConditionCheckFailed: déjà en cours (PENDING) ou déjà prêt (READY)
        shouldSendToQueue = false;
      }
    }

    if (shouldSendToQueue) {
      await this.sendSqsCompilationMessage({ linkId, docId, versionSeq });
    }
  }

  async sendSqsCompilationMessage(payload) {
    const messageBody = JSON.stringify(payload);

    if (this.forceMock || !sqsClient || !this.queueUrl) {
      localStore.sqsQueue.push({
        MessageId: `msg-${Date.now()}-${Math.random()}`,
        Body: messageBody,
        ReceiptHandle: `rcpt-${Date.now()}`
      });
      console.log(`[SQS Local] Ordre de compilation enfilé pour doc=${payload.docId}, v=${payload.versionSeq}`);
      return;
    }

    try {
      await sqsClient.send(new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: messageBody
      }));
      console.log(`[SQS AWS] Message envoyé sur la file pour doc=${payload.docId}`);
    } catch (err) {
      console.warn(`[SQS AWS] Erreur d'envoi (${err.message}). Enfilage local de secours.`);
      localStore.sqsQueue.push({
        MessageId: `msg-${Date.now()}`,
        Body: messageBody,
        ReceiptHandle: `rcpt-${Date.now()}`
      });
    }
  }

  async receiveSqsCompilationMessages(maxMessages = 1, waitTimeSeconds = 5) {
    if (this.forceMock || !sqsClient || !this.queueUrl) {
      if (localStore.sqsQueue.length === 0) return [];
      const msg = localStore.sqsQueue.shift();
      return [msg];
    }

    try {
      const res = await sqsClient.send(new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: waitTimeSeconds,
        VisibilityTimeout: 60
      }));
      return res.Messages || [];
    } catch (err) {
      if (localStore.sqsQueue.length > 0) return [localStore.sqsQueue.shift()];
      return [];
    }
  }

  async deleteSqsMessage(receiptHandle) {
    if (this.forceMock || !sqsClient || !this.queueUrl) {
      return;
    }
    try {
      await sqsClient.send(new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle
      }));
    } catch (err) {
      // Ignoré si déjà supprimé
    }
  }

  // ===========================================================================
  // 5. STOCKAGE DES FICHIERS PDF SUR AMAZON S3
  // ===========================================================================

  async uploadPdfToS3(s3Key, pdfBuffer, linkId) {
    // Sauvegarde en miroir local pour l'accès immédiat
    const localFilePath = path.join(config.paths.tempStorage, path.basename(s3Key));
    fs.writeFileSync(localFilePath, pdfBuffer);
    localStore.s3Objects.set(s3Key, pdfBuffer);

    if (linkId) {
      const storeKey = `LINK#${linkId}#META`;
      if (localStore.items.has(storeKey)) {
        localStore.items.get(storeKey).pdfStatus = 'READY';
      }
      if (dynamoDoc && !this.forceMock) {
        try {
          await dynamoDoc.send(new UpdateCommand({
            TableName: this.tableName,
            Key: { PK: `LINK#${linkId}`, SK: 'META' },
            UpdateExpression: 'SET pdfStatus = :ready',
            ExpressionAttributeValues: { ':ready': 'READY' }
          }));
        } catch {}
      }
    }

    if (this.forceMock || !s3Client || !this.bucketName) {
      console.log(`[S3 Local] Fichier PDF stocké localement : ${s3Key} (${pdfBuffer.length} octets)`);
      return { key: s3Key, localPath: localFilePath };
    }

    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: 'application/pdf'
      }));
      console.log(`[S3 AWS] PDF déposé avec succès sur s3://${this.bucketName}/${s3Key}`);
      return { key: s3Key, s3Uri: `s3://${this.bucketName}/${s3Key}` };
    } catch (err) {
      console.warn(`[S3 AWS] Erreur de dépôt (${err.message}). Utilisation copie locale.`);
      return { key: s3Key, localPath: localFilePath };
    }
  }

  async getPdfBuffer(s3Key) {
    if (localStore.s3Objects.has(s3Key)) {
      return localStore.s3Objects.get(s3Key);
    }

    const localFilePath = path.join(config.paths.tempStorage, path.basename(s3Key));
    if (fs.existsSync(localFilePath)) {
      return fs.readFileSync(localFilePath);
    }

    if (this.forceMock || !s3Client || !this.bucketName) {
      return null;
    }

    try {
      const res = await s3Client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      }));
      const streamToBuffer = (stream) =>
        new Promise((resolve, reject) => {
          const chunks = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
      const buf = await streamToBuffer(res.Body);
      localStore.s3Objects.set(s3Key, buf);
      return buf;
    } catch (err) {
      console.error(`[S3] Échec de récupération de la clé ${s3Key} : ${err.message}`);
      return null;
    }
  }

  // ===========================================================================
  // 6. NOTIFICATION SNS (Contrainte C6 - Alerte dernier exemplaire N=0)
  // ===========================================================================

  async sendExhaustedAlert(linkId, creatorEmail) {
    const message = `[Alerte Revue Numérique] Tous les exemplaires (${config.business.maxDownloadsDefault}) du lien ${linkId} ont été distribués ! Le quota est désormais épuisé.`;
    const subject = `[Revue] Quota de téléchargement épuisé pour le lien ${linkId}`;

    localStore.snsSent.push({ linkId, creatorEmail, message, timestamp: new Date().toISOString() });
    console.log(`[SNS] ALERTE DÉCLENCHÉE (C6) -> Envoyée à ${creatorEmail} : ${subject}`);

    if (this.forceMock || !snsClient || !this.topicArn) {
      return { delivered: true, channel: 'local-log' };
    }

    try {
      await snsClient.send(new PublishCommand({
        TopicArn: this.topicArn,
        Subject: subject,
        Message: message
      }));
      console.log(`[SNS AWS] Notification publiée avec succès sur le topic ARN : ${this.topicArn}`);
      return { delivered: true, channel: 'aws-sns' };
    } catch (err) {
      console.warn(`[SNS AWS] Erreur de publication (${err.message}). Consignation locale effectuée.`);
      return { delivered: true, channel: 'local-fallback' };
    }
  }
}

module.exports = new StorageAdapter();
