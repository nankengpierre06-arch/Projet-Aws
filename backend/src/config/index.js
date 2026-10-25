/**
 * Configuration globale de l'application
 * Centralise les paramètres d'environnement et les valeurs par défaut
 */
const path = require('path');
require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  portApi: parseInt(process.env.PORT_API || '8000', 10),
  portCollab: parseInt(process.env.PORT_COLLAB || '1234', 10),
  
  // AWS Configuration (Région unique imposée par le sujet)
  aws: {
    region: process.env.AWS_REGION || 'eu-west-3',
    dynamoTable: process.env.DYNAMODB_TABLE || 'JournalTable',
    s3Bucket: process.env.S3_BUCKET || 'revue-documents-storage',
    sqsQueueUrl: process.env.SQS_QUEUE_URL || '',
    snsTopicArn: process.env.SNS_TOPIC_ARN || '',
    // En développement local sans compte AWS connecté, bascule automatique sur adaptateur local
    useMock: process.env.USE_AWS_MOCK === 'true' || !process.env.AWS_REGION && !process.env.AWS_EXECUTION_ENV
  },

  // Règles métier issues du sujet
  business: {
    dailyCharLimit: parseInt(process.env.DAILY_CHAR_LIMIT || '10000', 10), // Contrainte C4
    maxDownloadsDefault: parseInt(process.env.MAX_DOWNLOADS || '500', 10), // Contrainte C1
    downloadTokenTtlSec: parseInt(process.env.TOKEN_TTL_SEC || '60', 10)   // Jeton à usage unique
  },

  // Chemins locaux
  paths: {
    tempStorage: path.resolve(__dirname, '../../storage_local')
  }
};

