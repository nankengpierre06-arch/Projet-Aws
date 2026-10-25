#!/bin/bash
set -e

# ==============================================================================
# Script de Déploiement Automatisé de l'Infrastructure AWS
# Région unique : eu-west-3 (Paris) ou configurable via AWS_REGION
# ==============================================================================

export AWS_REGION="${AWS_REGION:-eu-west-3}"
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text 2>/dev/null || echo "000000000000")
RANDOM_SUFFIX=$(openssl rand -hex 3 2>/dev/null || echo "app")

BUCKET_NAME="revue-documents-${ACCOUNT_ID}-${RANDOM_SUFFIX}"
TABLE_NAME="JournalTable"
QUEUE_NAME="pdf-generation-queue"
TOPIC_NAME="alerte-dernier-exemplaire"
ROLE_NAME="role-journal-app"
SG_NAME="sg-journal-web"

echo "=================================================================="
echo "   DÉPLOIEMENT DE L'INFRASTRUCTURE AWS DU JOURNAL COLLABORATIF    "
echo "=================================================================="
echo "Région AWS       : ${AWS_REGION}"
echo "Bucket S3        : ${BUCKET_NAME}"
echo "Table DynamoDB   : ${TABLE_NAME}"
echo "File SQS         : ${QUEUE_NAME}"
echo "Topic SNS        : ${TOPIC_NAME}"
echo "Rôle IAM         : ${ROLE_NAME}"
echo "=================================================================="

# 1. Création du Bucket S3 privé (Livrable Stockage)
echo "[1/7] Création du bucket Amazon S3..."
if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "${BUCKET_NAME}" --region "${AWS_REGION}"
else
    aws s3api create-bucket --bucket "${BUCKET_NAME}" --region "${AWS_REGION}" \
        --create-bucket-configuration LocationConstraint="${AWS_REGION}"
fi

# Chiffrement par défaut SSE-S3 et blocage de l'accès public
aws s3api put-bucket-encryption --bucket "${BUCKET_NAME}" \
    --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'

aws s3api put-public-access-block --bucket "${BUCKET_NAME}" \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# 2. Création de la Table Amazon DynamoDB (Mode On-Demand sans provisionnement)
echo "[2/7] Création de la table Amazon DynamoDB (${TABLE_NAME})..."
aws dynamodb create-table \
    --table-name "${TABLE_NAME}" \
    --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
    --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region "${AWS_REGION}" 2>/dev/null || echo "Table déjà existante."

# 3. Création de la File Amazon SQS
echo "[3/7] Création de la file Amazon SQS..."
QUEUE_URL=$(aws sqs create-queue --queue-name "${QUEUE_NAME}" --attributes VisibilityTimeout=60 --query "QueueUrl" --output text --region "${AWS_REGION}")
QUEUE_ARN=$(aws sqs get-queue-attributes --queue-url "${QUEUE_URL}" --attribute-names QueueArn --query "Attributes.QueueArn" --output text --region "${AWS_REGION}")

# 4. Création du Topic Amazon SNS (Alerte dernier exemplaire C6)
echo "[4/7] Création du topic Amazon SNS..."
TOPIC_ARN=$(aws sns create-topic --name "${TOPIC_NAME}" --query "TopicArn" --output text --region "${AWS_REGION}")

# 5. Création du Rôle IAM pour l'Instance EC2 (Moindre Privilège & IMDSv2)
echo "[5/7] Configuration du Rôle IAM..."
cat << 'EOF_TRUST' > /tmp/ec2-trust-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF_TRUST

aws iam create-role --role-name "${ROLE_NAME}" --assume-role-policy-document file:///tmp/ec2-trust-policy.json 2>/dev/null || true

# Politique au moindre privilège strictement bornée aux ressources créées
cat << EOF_POLICY > /tmp/journal-app-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:${AWS_REGION}:${ACCOUNT_ID}:table/${TABLE_NAME}"
    },
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    },
    {
      "Sid": "SQSAccess",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "${QUEUE_ARN}"
    },
    {
      "Sid": "SNSPublish",
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "${TOPIC_ARN}"
    }
  ]
}
EOF_POLICY

aws iam put-role-policy --role-name "${ROLE_NAME}" --policy-name "JournalAppPolicy" --policy-document file:///tmp/journal-app-policy.json

# Instance Profile
aws iam create-instance-profile --instance-profile-name "${ROLE_NAME}" 2>/dev/null || true
aws iam add-role-to-instance-profile --instance-profile-name "${ROLE_NAME}" --role-name "${ROLE_NAME}" 2>/dev/null || true

# 6. Création du Security Group
echo "[6/7] Configuration du Security Group..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region "${AWS_REGION}")
SG_ID=$(aws ec2 create-security-group --group-name "${SG_NAME}" --description "Security Group Web Journal" --vpc-id "${VPC_ID}" --query "GroupId" --output text --region "${AWS_REGION}" 2>/dev/null || \
        aws ec2 describe-security-groups --filters "Name=group-name,Values=${SG_NAME}" --query "SecurityGroups[0].GroupId" --output text --region "${AWS_REGION}")

aws ec2 authorize-security-group-ingress --group-id "${SG_ID}" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "${AWS_REGION}" 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id "${SG_ID}" --protocol tcp --port 443 --cidr 0.0.0.0/0 --region "${AWS_REGION}" 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id "${SG_ID}" --protocol tcp --port 22 --cidr 0.0.0.0/0 --region "${AWS_REGION}" 2>/dev/null || true

# 7. Lancement de l'Instance EC2 t3.micro
echo "[7/7] Lancement de l'instance Amazon EC2 (t3.micro)..."
AMI_ID=$(aws ssm get-parameter --name "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64" --query "Parameter.Value" --output text --region "${AWS_REGION}")

INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "${AMI_ID}" \
    --instance-type t3.micro \
    --iam-instance-profile Name="${ROLE_NAME}" \
    --security-group-ids "${SG_ID}" \
    --user-data file://infrastructure/user-data.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=JournalCollaboratif-App}]" \
    --metadata-options "HttpTokens=required,HttpEndpoint=enabled" \
    --query "Instances[0].InstanceId" \
    --output text \
    --region "${AWS_REGION}")

echo "Instance EC2 créée : ${INSTANCE_ID}"
echo "Attente de l'attribution de l'IP publique..."
aws ec2 wait instance-running --instance-ids "${INSTANCE_ID}" --region "${AWS_REGION}"
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "${INSTANCE_ID}" --query "Reservations[0].Instances[0].PublicIpAddress" --output text --region "${AWS_REGION}")

echo "=================================================================="
echo "         DÉPLOIEMENT AWS TERMINÉ AVEC SUCCÈS !                   "
echo "=================================================================="
echo "Adresse Web publique : http://${PUBLIC_IP}"
echo "API de téléchargement: http://${PUBLIC_IP}/api/download/<id>"
echo "Serveur WebSockets   : ws://${PUBLIC_IP}:1234/ws/<docId>"
echo "Instance ID          : ${INSTANCE_ID}"
echo "Bucket S3            : ${BUCKET_NAME}"
echo "=================================================================="
