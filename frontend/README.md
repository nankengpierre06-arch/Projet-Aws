# Module Frontend - Interface Rédacteur & Lecteur

Application Single Page (SPA) développée avec React 18, Vite et Lucide Icons.

## Fonctionnalités Frontend

1. **Espace Rédacteur & Collaboration Temps Réel** :
   - Éditeur de texte collaboratif branché sur WebSockets Yjs.
   - Curseur et présence en direct des collaborateurs connectés.
   - Jauge en temps réel du quota quotidien de 10 000 caractères (Contrainte C4).

2. **Gestion Dynamique des Versions & Instantanés T1 (Contrainte C3)** :
   - Sélection simple de n'importe quel document pour afficher instantanément toutes les versions.
   - Enregistrement automatique sans intervention manuelle du rédacteur.
   - Restauration en un clic vers n'importe quelle version antérieure.

3. **Workflow d'Invitations et Notifications (EF02)** :
   - Validation ou rejet des invitations à collaborer exclusivement depuis la page Notifications.
   - Affichage immédiat des documents acceptés dans la section « Documents Partagés ».

4. **Portail de Parution Publique (Contrainte C1)** :
   - Téléchargement direct du PDF certifié dès le clic sur le lien.
   - Prise en compte immédiate des 500 exemplaires certifiés avec arbitrage atomique.
