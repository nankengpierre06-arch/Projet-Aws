# Projet d'Évaluation : Éditeur de Documents Partagé & Distribution de Revue

[![Build & Tests](https://img.shields.io/badge/Tests_C1_%26_C4-100%25_PASS-success.svg)](./tests/RAPPORT_TESTS.md)
[![AWS Free Tier](https://img.shields.io/badge/AWS-Free_Tier_Compliant-orange.svg)](./docs/COUT.md)
[![Architecture](https://img.shields.io/badge/Architecture-EC2%20%7C%20DynamoDB%20%7C%20S3%20%7C%20SQS-blue.svg)](./architecture_aws.drawio)

Ce dépôt contient l'implémentation complète, l'infrastructure automatisée, les tests de charge et le dossier de conception pour l'éditeur collaboratif de la revue étudiante, conçu pour résister au pic de parution de 15 000 visiteurs avec un tirage limité à 500 exemplaires.

---

## 1. Table des Livrables Officiels (Conformité Sujet)

| Livrable Exigé | Emplacement dans le Dépôt | Description |
| :--- | :--- | :--- |
| **Livrable 1 : Code & Infrastructure** | `backend/`, `frontend/`, `infrastructure/` | Code complet de l'application, scripts de déploiement et configuration Nginx/systemd. |
| **Livrable 2 : Dossier de Conception** | [`rapport/main.pdf`](./rapport/main.pdf) | Rapport d'architecture modulaire de 41 pages en LaTeX avec justifications techniques approfondies. |
| **Livrable 3 : Rapport de Tests** | [`tests/RAPPORT_TESTS.md`](./tests/RAPPORT_TESTS.md) | Résultats bruts, débits (800 req/s), latences et preuve formelle des contraintes C1, C2 et C4. |
| **Livrable 4 : Spécification de l'API** | [`docs/API.md`](./docs/API.md) | Documentation détaillée des routes REST et du protocole WebSocket pour le jury. |
| **Livrable 5 : Bilan Financier** | [`docs/COUT.md`](./docs/COUT.md) | Décomposition des coûts AWS démontrant une facture totale inférieure à 0,05 $ USD. |

---

## 2. Architecture & Choix Technologiques

* **Frontend :** Application Web monopage en **React 18 + Vite** avec l'éditeur **Quill.js** couplé à **Yjs (CRDT)** et au sous-protocole **Awareness** pour les curseurs et présences en direct.
* **Serveur Frontal :** **Nginx** assurant la terminaison TLS, la compression Gzip et l'aiguillage protocolaire dynamique (`/api` vers le port 8000 et `/ws` vers le port 1234).
* **Serveur Applicatif (EC2 `t3.micro`) :** Runtime **Node.js LTS** asynchrone non-bloquant maintenant 300 connexions WebSockets persistantes avec moins de 150 Mo de RAM.
* **Gatekeeper d'Admission (Contrainte C1) :** Décrément atomique direct en $O(1)$ dans **Amazon DynamoDB** (`SET places = places - 1 WHERE places > 0`) et délivrance par **jeton à usage unique** empêchant tout partage ou rejeu de lien.
* **Moteur de Rendu Documentaire (Contrainte C5) :** Compilateur natif **Typst** écrit en Rust, produisant le PDF vectoriel en moins de 80 ms avec moins de 40 Mo de RAM.
* **Découplage Asynchrone :** **Amazon SQS** pour absorber le pic de requêtes et **Amazon S3** pour l'hébergement durable des fichiers compilés.
* **Alerte Dernier Exemplaire (Contrainte C6) :** Notification par e-mail automatique au créateur via **Amazon SNS** dès que les places restantes atteignent 0.

---

## 3. Déploiement et Démarrage Rapide

### Option A : Exécution Locale (Développement & Démonstration)

Pour tester immédiatement l'ensemble de l'application sur votre poste :

```bash
# 1. Installer et démarrer le Backend (API + WebSockets + Worker)
cd backend
npm install
node bin/server.js
```

Dans un second terminal :

```bash
# 2. Installer et lancer l'interface Frontend
cd frontend
npm install
npm run dev
```

Ouvrez ensuite votre navigateur sur **http://localhost:3000** :
* Saisissez votre nom et votre adresse e-mail pour rejoindre la rédaction collaborative.
* L'onglet **Supervision Association** permet de suivre en direct les documents ouverts, les liens actifs et les utilisateurs bloqués.

---

### Option B : Déploiement Automatisé sur AWS (Production)

Le script automatisé provisionne l'ensemble de l'infrastructure en région `eu-west-3` (Paris) en respectant strictement le moindre privilège IAM (aucune clé en dur) :

```bash
# Vérifiez que vos identifiants AWS sont configurés (aws configure)
./infrastructure/setup_aws.sh
```

Le script crée :
1. Le bucket privé Amazon S3 avec chiffrement par défaut et blocage public.
2. La table Amazon DynamoDB en mode *On-Demand* (`JournalTable`).
3. La file Amazon SQS (`pdf-generation-queue`).
4. Le topic Amazon SNS (`alerte-dernier-exemplaire`).
5. Le rôle IAM avec métadonnées IMDSv2.
6. L'instance EC2 `t3.micro` avec Amazon Linux 2023 et le script d'initialisation `user-data.sh`.

---

## 4. Exécution de la Suite de Tests Automatisés

Pour rejouer l'ensemble des tests de charge et prouver le respect des contraintes C1 et C4 :

```bash
./tests/run_all_tests.sh
```

Ce script lance le serveur en arrière-plan, envoie une rafale de requêtes concurrentes frappant le Gatekeeper et affiche le rapport de validation :
* **Preuve C1 :** Exactement 500 réponses `HTTP 200` et rejets `HTTP 410` pour les requêtes excédentaires.
* **Preuve Jeton Unique :** Tentative de rejeu invalidée immédiatement avec `HTTP 403 Forbidden`.
* **Preuve C4 & Anti-Abus :** Blocage automatique pour 15 minutes des personnes tentant d'écrire au-delà de 10 000 caractères par jour.

---

## 5. Suppression Complète de l'Infrastructure (Teardown)

Pour détruire l'ensemble des ressources AWS créées et garantir une facture nulle :

```bash
./infrastructure/teardown_aws.sh
```

Ce script termine l'instance EC2, vide et supprime les buckets S3, supprime la table DynamoDB, la file SQS, le topic SNS et le rôle IAM.
