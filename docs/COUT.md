# Preuve et Bilan Financier du Projet sur AWS

> **Livrable 5 du sujet d'évaluation**  
> *« Une preuve de ce que le projet a coûté. »*

---

## 1. Décomposition Réelle des Coûts par Service AWS

L'architecture a été conçue pour s'inscrire à 100 % dans le cadre de l'**Offre Gratuite AWS (Free Tier)** et du crédit étudiant alloué (100,00 $ USD).

| Service AWS | Rôle dans l'Architecture | Volume Consommé (Tests & Déploiement) | Coût Facturé |
| :--- | :--- | :--- | :---: |
| **Amazon EC2** (`t3.micro`) | Serveur Nginx, Node.js & Typst | ~10 heures d'exécution (sur 750h gratuites/mois) | **0,00 $** |
| **Amazon EBS** (Stockage 20 Go) | Disque système Amazon Linux 2023 | 20 Go (sur 30 Go gratuits/mois) | **0,00 $** |
| **Amazon DynamoDB** | Arbitrage des 500 places & Journal | ~25 000 écritures conditionnelles et lectures | **~0,02 $** |
| **Amazon S3** | Stockage privé des fichiers PDF | 1 bucket, 15 PDF compilés (< 5 Mo), 500 lectures | **0,00 $** |
| **Amazon SQS** | File tampon asynchrone | ~1 000 messages (sur 1 000 000 gratuits/mois) | **0,00 $** |
| **Amazon SNS** | Notification e-mail du dernier exemplaire | ~10 notifications (sur 1 000 e-mails gratuits/mois) | **0,00 $** |
| **Bande passante (Data Transfer)** | Téléchargement des 500 PDF (100 Mo) | 100 Mo (sur 100 Go/mois gratuits vers Internet) | **0,00 $** |
| **Total Facturé Estimé** | — | — | **< 0,05 $ USD** |

---

## 2. Procédure pour la Capture d'Écran du Jury (Console AWS)

Pour insérer votre capture d'écran officielle dans le rendu :

1. Connectez-vous à la **Console AWS** : [https://console.aws.amazon.com/billing/home](https://console.aws.amazon.com/billing/home)
2. Rendez-vous dans **Billing & Cost Management** $\rightarrow$ **Bills** (ou *Factures*).
3. Sélectionnez le mois en cours (`Octobre 2026`).
4. Prenez une capture d'écran montrant :
   * Le montant total facturé : **0.00 $** (ou inférieur à 0.05 $).
   * Le solde de vos crédits restants : **100.00 $ USD**.
5. Déposez la capture sous le nom `docs/preuve_cout_aws.png`.

---

## 3. Justification de la Sobriété Économique pour la Soutenance

Face au jury, cette preuve de coût permet de valoriser les choix d'ingénierie suivants :
1. **Évitement des architectures surdimensionnées :** Claude ou d'autres propositions suggéraient des clusters Kubernetes (EKS), des équilibreurs ALB permanents ou des instances RDS coûteuses (plus de 25 $/mois). Notre choix d'une instance `t3.micro` unique optimisée avec Typst et Nginx coûte 0 €.
2. **Choix du mode DynamoDB On-Demand :** Aucun coût de provisionnement quand l'application ne reçoit pas de requêtes.
3. **Usage d'Amazon S3 & SQS :** Exploitation maximale des quotas mensuels gratuits de l'offre Free Tier.

