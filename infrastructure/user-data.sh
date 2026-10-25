#!/bin/bash
set -e

# ==============================================================================
# Script d'Initialisation Automatique de l'Instance EC2 (Cloud-Init / User-Data)
# Conforme à Amazon Linux 2023 (Architecture AWS t3.micro)
# ==============================================================================

exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "=== [1/7] Démarrage de l'installation du Journal Collaboratif ==="

# 1. Mise à jour système et installation des paquets de base
dnf update -y
dnf install -y git nginx tar xz

# 2. Installation de Node.js 20 LTS
dnf module reset nodejs -y || true
dnf module enable nodejs:20 -y || true
dnf install -y nodejs npm

# 3. Installation du compilateur natif Typst (Rust ultra-rapide < 80 ms)
echo "=== [2/7] Installation de Typst ==="
TYPST_VERSION="v0.11.1"
curl -sSL "https://github.com/typst/typst/releases/download/${TYPST_VERSION}/typst-x86_64-unknown-linux-musl.tar.xz" -o /tmp/typst.tar.xz
tar -xf /tmp/typst.tar.xz -C /tmp
mv /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst
chmod +x /usr/local/bin/typst
typst --version

# 4. Préparation du répertoire applicatif
echo "=== [3/7] Déploiement du code ==="
mkdir -p /var/www/journal
chown -R ec2-user:ec2-user /var/www/journal

# Copie ou clonage de l'application
if [ -d "/home/ec2-user/Projet_AWS" ]; then
    cp -r /home/ec2-user/Projet_AWS/* /var/www/journal/
fi

# 5. Injection de l'environnement sécurisé (ZÉRO CLÉ EN DUR)
echo "=== [4/7] Configuration des variables d'environnement ==="
cat << 'ENVFILE' > /etc/journal.env
NODE_ENV=production
PORT_API=8000
PORT_COLLAB=1234
AWS_REGION=eu-west-3
DYNAMODB_TABLE=JournalTable
S3_BUCKET=revue-documents-storage
DAILY_CHAR_LIMIT=10000
MAX_DOWNLOADS=500
USE_AWS_MOCK=false
ENVFILE

chmod 600 /etc/journal.env

# 6. Installation des dépendances et compilation
echo "=== [5/7] Build de l'application ==="
if [ -f "/var/www/journal/backend/package.json" ]; then
    cd /var/www/journal/backend
    npm ci --omit=dev || npm install --omit=dev
fi

if [ -f "/var/www/journal/frontend/package.json" ]; then
    cd /var/www/journal/frontend
    npm ci || npm install
    npm run build
fi

# 7. Configuration de Nginx
echo "=== [6/7] Configuration Nginx ==="
if [ -f "/var/www/journal/infrastructure/nginx.conf" ]; then
    cp /var/www/journal/infrastructure/nginx.conf /etc/nginx/conf.d/journal.conf
    # Supprimer la config par défaut pour éviter les conflits
    rm -f /etc/nginx/conf.d/default.conf || true
fi

systemctl daemon-reload
systemctl enable nginx
systemctl restart nginx

# 8. Activation des 3 services systemd (Restart=always)
echo "=== [7/7] Démarrage des services systemd ==="
cp /var/www/journal/infrastructure/systemd/*.service /etc/systemd/system/
systemctl daemon-reload

systemctl enable journal-collab.service
systemctl enable journal-api.service
systemctl enable journal-worker.service

systemctl restart journal-collab.service
systemctl restart journal-api.service
systemctl restart journal-worker.service

echo "=== Déploiement terminé avec succès ! ==="
systemctl status journal-api.service --no-pager
