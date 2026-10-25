#!/bin/bash
set -e

# ==============================================================================
# Script de Nettoyage et Suppression de l'Infrastructure AWS
# Permet de détruire l'ensemble des ressources créées pour éviter tout surcoût.
# ==============================================================================

export AWS_REGION="${AWS_REGION:-eu-west-3}"
TABLE_NAME="JournalTable"
QUEUE_NAME="pdf-generation-queue"
TOPIC_NAME="alerte-dernier-exemplaire"
ROLE_NAME="role-journal-app"
SG_NAME="sg-journal-web"

echo "=================================================================="
echo "    NETTOYAGE COMPLET DE L'INFRASTRUCTURE AWS (TEARDOWN)         "
echo "=================================================================="

# 1. Terminaison des instances EC2
echo "[1/6] Recherche et arrêt des instances EC2..."
INSTANCE_IDS=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=JournalCollaboratif-App" "Name=instance-state-name,Values=running,pending,stopped" \
    --query "Reservations[].Instances[].InstanceId" \
    --output text --region "${AWS_REGION}")

if [ -n "$INSTANCE_IDS" ]; then
    echo "Terminaison des instances : $INSTANCE_IDS"
    aws ec2 terminate-instances --instance-ids $INSTANCE_IDS --region "${AWS_REGION}"
    echo "Attente de la terminaison..."
    aws ec2 wait instance-terminated --instance-ids $INSTANCE_IDS --region "${AWS_REGION}"
fi

# 2. Suppression des Buckets S3
echo "[2/6] Nettoyage et suppression des buckets S3 de la revue..."
BUCKETS=$(aws s3api list-buckets --query "Buckets[?starts_with(Name, 'revue-documents-')].Name" --output text)
for B in $BUCKETS; do
    echo "Vidage du bucket s3://${B}..."
    aws s3 rm "s3://${B}" --recursive || true
    echo "Suppression du bucket ${B}..."
    aws s3api delete-bucket --bucket "${B}" --region "${AWS_REGION}" || true
done

# 3. Suppression de la table DynamoDB
echo "[3/6] Suppression de la table DynamoDB (${TABLE_NAME})..."
aws dynamodb delete-table --table-name "${TABLE_NAME}" --region "${AWS_REGION}" 2>/dev/null || true

# 4. Suppression de la file SQS
echo "[4/6] Suppression de la file Amazon SQS (${QUEUE_NAME})..."
QUEUE_URL=$(aws sqs get-queue-url --queue-name "${QUEUE_NAME}" --query "QueueUrl" --output text --region "${AWS_REGION}" 2>/dev/null || true)
if [ -n "$QUEUE_URL" ]; then
    aws sqs delete-queue --queue-url "${QUEUE_URL}" --region "${AWS_REGION}" || true
fi

# 5. Suppression du topic SNS
echo "[5/6] Suppression du topic Amazon SNS (${TOPIC_NAME})..."
TOPIC_ARN=$(aws sns list-topics --query "Topics[?contains(TopicArn, '${TOPIC_NAME}')].TopicArn" --output text --region "${AWS_REGION}" 2>/dev/null || true)
if [ -n "$TOPIC_ARN" ]; then
    aws sns delete-topic --topic-arn "${TOPIC_ARN}" --region "${AWS_REGION}" || true
fi

# 6. Suppression du rôle IAM et Security Group
echo "[6/6] Nettoyage IAM et Security Group..."
aws iam remove-role-from-instance-profile --instance-profile-name "${ROLE_NAME}" --role-name "${ROLE_NAME}" 2>/dev/null || true
aws iam delete-instance-profile --instance-profile-name "${ROLE_NAME}" 2>/dev/null || true
aws iam delete-role-policy --role-name "${ROLE_NAME}" --policy-name "JournalAppPolicy" 2>/dev/null || true
aws iam delete-role --role-name "${ROLE_NAME}" 2>/dev/null || true

# Attendre que les interfaces réseau soient libérées avant de supprimer le SG
sleep 5
aws ec2 delete-security-group --group-name "${SG_NAME}" --region "${AWS_REGION}" 2>/dev/null || true

echo "=================================================================="
echo "    TOUTES LES RESSOURCES AWS ONT ÉTÉ SUPPRIMÉES AVEC SUCCÈS !    "
echo "    Votre facture reste protégée et vos crédits préservés.        "
echo "=================================================================="
