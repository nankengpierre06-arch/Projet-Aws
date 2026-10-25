# Infrastructure Cloud AWS - Revue Collaborative Étudiante

Ce dossier contient l'ensemble des définitions et outils de déploiement de l'infrastructure AWS, respectant la région unique `eu-west-3` (Paris) et les contraintes de coût et d'architecture.

## Composants Cloud

1. **Amazon DynamoDB (Table `JournalTable`)** :
   - Clé de partition : `PK` (String) | Clé de tri : `SK` (String).
   - Mode On-Demand (sans provisionnement payant).
   - Supporte le décrément atomique (C1), le journal immuable des deltas (C2), les versions dynamiques (C3) et les quotas quotidiens (C4).

2. **Amazon S3 (Compartiment Privé)** :
   - Stockage chiffré SSE-S3 pour les PDF compilés.
   - Blocage public total (sécurité).

3. **Amazon SQS (File `pdf-generation-queue`)** :
   - Découplage asynchrone entre la requête utilisateur et le worker de compilation Typst (Contrainte C5).
   - Visibilité configurée à 60s.

4. **Amazon SNS (Topic `alerte-dernier-exemplaire`)** :
   - Notification automatique lors de l'attribution de la dernière place N=500 (Contrainte C6).

5. **Déploiement en Infrastructure as Code (CDK & Bash)** :
   - `cdk/` : Stack CDK v2 complète (`lib/journal-stack.js`).
   - `setup_aws.sh` : Script automatisé avec configuration IAM et lancement de l'instance EC2 t3.micro.
   - `user-data.sh` : Script d'initialisation automatique au démarrage de l'instance.
