# Infrastructure AWS avec AWS CDK (v2)

Ce dossier contient la définition complète en **Infrastructure as Code (IaC)** de la plateforme avec **AWS CDK v2** (JavaScript / TypeScript).

## Ressources déclarées dans la Stack CDK (`lib/journal-stack.js`)

1. **Amazon DynamoDB** : Table `JournalTable` (Partition Key `PK`, Sort Key `SK`), mode On-Demand (sans provisionnement, parfait pour les coûts étudiants).
2. **Amazon S3** : Compartiment privé avec chiffrement SSE-S3 et blocage public total pour les PDF compilés.
3. **Amazon SQS** : File `pdf-generation-queue` pour le découplage asynchrone du compilateur Typst.
4. **Amazon SNS** : Topic `alerte-dernier-exemplaire` pour la contrainte C6.
5. **AWS IAM** : Rôle au moindre privilège `role-journal-app` avec `grantReadWriteData`, `grantConsumeMessages`, etc.

## Commandes CDK

```bash
# 1. Installer les dépendances CDK
npm install

# 2. Prévisualiser le template CloudFormation généré
npx cdk synth

# 3. Déployer l'infrastructure sur votre compte AWS
npx cdk deploy
```
