# Module Backend - Revue Collaborative Étudiante

Ce module implémente l'ensemble des services serveur et de persistance conformément aux exigences fonctionnelles et contraintes d'architecture :

## Architecture Backend

1. **Passerelle API REST & Gatekeeper (Port 8000)** :
   - `/api/documents` : Gestion documentaire, création, permissions, invitations et versions dynamiques (EF01, EF02, EF06, C3).
   - `/api/download` : Arbitrage atomique de parution à quota limité N=500 places et délivrance de jetons uniques (Contrainte C1).
   - `/api/links` : Création et programmation des liens de parution avec restriction de l'annonce officielle à l'administration.
   - `/api/admin` : Tableau de bord de supervision de l'association (documents ouverts, liens actifs, utilisateurs bloqués).

2. **Serveur de Collaboration Temps Réel (Port 1234)** :
   - Protocole binaire Yjs (CRDT) et Awareness (présence et curseurs en direct).
   - Journalisation immuable des deltas dans DynamoDB (Contrainte C2 - Zéro perte).
   - Contrôle strict du crédit d'écriture de 10 000 caractères/jour et blocage anti-abus (Contrainte C4).
   - Sauvegarde dynamique et automatique des instantanés T1 lors de la saisie (Contrainte C3).

3. **Worker Asynchrone de Compilation PDF** :
   - Consommateur SQS en long-polling découplé (Contrainte C5).
   - Génération Typst avec métadonnées d'exemplaire certifié.

