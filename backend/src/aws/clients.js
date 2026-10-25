/**
 * Client AWS SDK v3 avec fallback automatique local
 * Permet d'exécuter l'application soit sur AWS réel (EC2 / IAM),
 * soit en local avec persistance mémoire/fichier pour les tests.
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');
const { SQSClient } = require('@aws-sdk/client-sqs');
const { SNSClient } = require('@aws-sdk/client-sns');
const config = require('../config');

let dynamoDoc = null;
let s3Client = null;
let sqsClient = null;
let snsClient = null;

try {
  const baseConfig = { region: config.aws.region };
  
  const rawDynamo = new DynamoDBClient(baseConfig);
  dynamoDoc = DynamoDBDocumentClient.from(rawDynamo, {
    marshallOptions: { removeUndefinedValues: true }
  });
  
  s3Client = new S3Client(baseConfig);
  sqsClient = new SQSClient(baseConfig);
  snsClient = new SNSClient(baseConfig);
  console.log(`[AWS Clients] Initialisés avec succès sur la région : ${config.aws.region}`);
} catch (err) {
  console.warn(`[AWS Clients] Avertissement : échec d'initialisation des clients natifs (${err.message}). Bascule mode local.`);
}

module.exports = {
  dynamoDoc,
  s3Client,
  sqsClient,
  snsClient,
  isMock: config.aws.useMock
};
