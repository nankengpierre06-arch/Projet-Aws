/**
 * Worker asynchrone de compilation PDF (Consommateur de la file SQS)
 * - Découplage complet du chemin critique de téléchargement (Contrainte C5)
 * - Traite les ordres de rendu de manière lissée
 * - Dépose le binaire PDF final sur Amazon S3
 */
const storage = require('../aws/storage-adapter');
const typstCompiler = require('./typst-compiler');

class PdfWorker {
  constructor() {
    this.isRunning = false;
    this.pollInterval = 1000; // 1 seconde entre chaque scrutation
  }

  async start() {
    this.isRunning = true;
    console.log('[PDF Worker] Démarré et à l\'écoute de la file SQS (Long Polling)...');
    this.loop();
  }

  async loop() {
    while (this.isRunning) {
      try {
        const messages = await storage.receiveSqsCompilationMessages(1, 2);

        for (const msg of messages) {
          await this.processMessage(msg);
        }
      } catch (err) {
        console.error(`[PDF Worker] Erreur boucle : ${err.message}`);
      }

      await new Promise(r => setTimeout(r, this.pollInterval));
    }
  }

  async processMessage(msg) {
    let payload;
    try {
      payload = typeof msg.Body === 'string' ? JSON.parse(msg.Body) : msg.Body;
    } catch {
      payload = msg.Body;
    }

    const { linkId, docId, versionSeq } = payload || {};
    if (!linkId || !docId) return;

    console.log(`[PDF Worker] Début de compilation pour doc=${docId}, version=${versionSeq} (link=${linkId})...`);
    const startTime = Date.now();

    try {
      // 1. Récupération des métadonnées du document
      const doc = await storage.getDocumentMetadata(docId);
      const title = doc ? doc.title : `Revue Numérique - Édition ${versionSeq}`;

      // 2. Compilation haute vitesse avec Typst
      const pdfBuffer = await typstCompiler.compileToPdf({
        title,
        content: `Contenu officiel certifié de la revue #${versionSeq}.\nÉdité de façon collaborative par les étudiants.\nCe document reflète l'état stabilisé (Instantané T1) du texte.`,
        versionSeq,
        docId
      });

      const compileDuration = Date.now() - startTime;
      console.log(`[PDF Worker] Compilation terminée en ${compileDuration} ms (${pdfBuffer.length} octets)`);

      // 3. Dépôt de l'artéfact PDF sur Amazon S3
      const s3Key = `pdfs/${docId}/v${versionSeq}.pdf`;
      await storage.uploadPdfToS3(s3Key, pdfBuffer, linkId);

      // 4. Acquittement et suppression du message de la file SQS
      if (msg.ReceiptHandle) {
        await storage.deleteSqsMessage(msg.ReceiptHandle);
      }

      console.log(`[PDF Worker] Ordre de rendu acquitté avec succès pour le lien ${linkId}`);
    } catch (err) {
      console.error(`[PDF Worker] Échec traitement message : ${err.message}`);
    }
  }

  stop() {
    this.isRunning = false;
    console.log('[PDF Worker] Arrêté.');
  }
}

module.exports = PdfWorker;

if (require.main === module) {
  const worker = new PdfWorker();
  worker.start();
}
