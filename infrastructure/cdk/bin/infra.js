#!/usr/bin/env node
const cdk = require('aws-cdk-lib');
const { JournalStack } = require('../lib/journal-stack');

const app = new cdk.App();
new JournalStack(app, 'JournalCollaboratifStack', {
  env: {
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'eu-west-3',
    account: process.env.CDK_DEFAULT_ACCOUNT
  },
  description: 'Infrastructure AWS du Journal Étudiant Collaboratif (DynamoDB, S3, SQS, SNS, IAM)'
});
