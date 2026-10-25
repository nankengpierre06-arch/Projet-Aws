/**
 * Script maître démarrant l'ensemble des modules applicatifs :
 * 1. Passerelle API REST & Gatekeeper (Port 8000)
 * 2. Serveur de collaboration temps réel Yjs (Port 1234)
 * 3. Worker de compilation PDF asynchrone (Consommateur SQS)
 */
const apiApp = require('../src/api/app');
const collabServer = require('../src/collab/server');
const PdfWorker = require('../src/worker/pdf-worker');
const config = require('../src/config');

console.log('===============================================================');
console.log('       DÉMARRAGE DE LA REVUE COLLABORATIVE (BACKEND)          ');
console.log('===============================================================');

// 1. Démarrer l'API REST
const apiServer = apiApp.listen(config.portApi, () => {
  console.log(`[1/3] Passerelle REST & Gatekeeper active sur http://127.0.0.1:${config.portApi}`);
});

// 2. Démarrer le serveur de collaboration WSS (Singleton)
collabServer.start();
console.log(`[2/3] Serveur de synchronisation WSS actif sur ws://127.0.0.1:${config.portCollab}`);

// 3. Démarrer le Worker PDF
const pdfWorker = new PdfWorker();
pdfWorker.start();
console.log(`[3/3] Worker asynchrone Typst / SQS actif`);

console.log('---------------------------------------------------------------');
console.log(`Région AWS ciblée : ${config.aws.region}`);
console.log(`Table DynamoDB : ${config.aws.dynamoTable}`);
console.log(`Bucket S3 : ${config.aws.s3Bucket}`);
console.log(`Mode : ${config.aws.useMock ? 'Simulation locale / Test' : 'Production Cloud AWS'}`);
console.log('===============================================================');

// Gestion propre de l'arrêt (Graceful Shutdown)
process.on('SIGINT', () => {
  console.log('\n[Arrêt] Fermeture propre des services...');
  apiServer.close();
  collabServer.stop();
  pdfWorker.stop();
  process.exit(0);
});
