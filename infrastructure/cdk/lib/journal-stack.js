const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const s3 = require('aws-cdk-lib/aws-s3');
const sqs = require('aws-cdk-lib/aws-sqs');
const sns = require('aws-cdk-lib/aws-sns');
const iam = require('aws-cdk-lib/aws-iam');

class JournalStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // 1. Table DynamoDB (NoSQL - C1, C2, C3, C4)
    const table = new dynamodb.Table(this, 'JournalTable', {
      tableName: 'JournalTable',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-Demand (Pay-as-you-go)
      removalPolicy: RemovalPolicy.DESTROY
    });

    // 2. Bucket S3 (Stockage Privé des PDF - C5)
    const bucket = new s3.Bucket(this, 'RevueDocumentsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // 3. File SQS (Découplage Worker Typst / PDF - C5)
    const queue = new sqs.Queue(this, 'PdfGenerationQueue', {
      queueName: 'pdf-generation-queue',
      visibilityTimeout: Duration.seconds(60)
    });

    // 4. Topic SNS (Alerte Dernier Exemplaire - C6)
    const topic = new sns.Topic(this, 'AlerteDernierExemplaire', {
      topicName: 'alerte-dernier-exemplaire',
      displayName: 'Alerte Tirage Journal Étudiant'
    });

    // 5. Rôle IAM Moindre Privilège pour l'Application / EC2 (IMDSv2)
    const appRole = new iam.Role(this, 'JournalAppRole', {
      roleName: 'role-journal-app',
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });

    // Attribution stricte des permissions IAM au moindre privilège
    table.grantReadWriteData(appRole);
    bucket.grantReadWrite(appRole);
    queue.grantConsumeMessages(appRole);
    queue.grantSendMessages(appRole);
    topic.grantPublish(appRole);
  }
}

module.exports = { JournalStack };
