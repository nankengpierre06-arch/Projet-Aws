# Documentation de l'API — Journal Numérique Collaboratif

> **Livrable 4 du sujet d'évaluation**  
> *« Une description de l’API de l’application, assez précise pour que le jury puisse écrire son propre test. »*

---

## 1. Principes Généraux et Authentification

* **Format d'échange :** JSON (`application/json`) pour les métadonnées REST, binaire (`application/pdf`) pour les téléchargements, et binaire (`Uint8Array`) pour les flux WebSockets.
* **Authentification déclarative :** Conformément au sujet, aucun mot de passe n'est exigé. Un rédacteur s'identifie en fournissant son nom et son e-mail via le corps de la requête ou les paramètres d'URL (`?email=...&name=...`). Les visiteurs qui téléchargent sont **100 % anonymes**.

---

## 2. Endpoints de Gestion des Documents et Versions

### `POST /api/documents`
Crée un nouveau document collaboratif.
* **Corps de la requête :**
  ```json
  {
    "title": "Revue Annuelle des Étudiants",
    "ownerEmail": "redacteur-chef@etudiant.fr"
  }
  ```
* **Réponse (HTTP 201 Created) :**
  ```json
  {
    "message": "Document créé avec succès",
    "docId": "doc-a1b2c3d4",
    "document": {
      "PK": "DOC#doc-a1b2c3d4",
      "SK": "META",
      "title": "Revue Annuelle des Étudiants",
      "ownerEmail": "redacteur-chef@etudiant.fr",
      "currentVersion": 1,
      "authorizedWriters": ["redacteur-chef@etudiant.fr"]
    }
  }
  ```

---

### `POST /api/documents/:docId/shares`
Accorde les droits d'écriture sur un document à un autre rédacteur (EF02).
* **Corps de la requête :**
  ```json
  {
    "email": "collaborateur@etudiant.fr"
  }
  ```
* **Réponse (HTTP 200 OK) :**
  ```json
  {
    "message": "Droits d'écriture accordés à collaborateur@etudiant.fr",
    "docId": "doc-a1b2c3d4",
    "authorizedWriters": ["redacteur-chef@etudiant.fr", "collaborateur@etudiant.fr"]
  }
  ```

---

### `POST /api/documents/:docId/versions`
Fige un instantané du document à l'instant T1 (Contrainte C3 & EF06).
* **Corps de la requête :**
  ```json
  {
    "label": "Version validée par le comité",
    "authorEmail": "redacteur-chef@etudiant.fr"
  }
  ```
* **Réponse (HTTP 201 Created) :**
  ```json
  {
    "message": "Nouvelle version figée créée (Instantané T1)",
    "docId": "doc-a1b2c3d4",
    "versionSeq": 2,
    "label": "Version validée par le comité",
    "createdAt": "2026-10-25T08:00:00.000Z"
  }
  ```

---

### `POST /api/documents/:docId/restore/:versionSeq`
Restaure le document à une version antérieure et synchronise instantanément tous les collaborateurs connectés (EF07).
* **Réponse (HTTP 200 OK) :**
  ```json
  {
    "message": "Document restauré avec succès à la version #2 !",
    "docId": "doc-a1b2c3d4",
    "restoredVersion": "2"
  }
  ```

---

## 3. Endpoints de Téléchargement et Gatekeeper (Contrainte C1)

### `POST /api/links`
Génère un lien de téléchargement public avec quota de places.
* **Corps de la requête :**
  ```json
  {
    "docId": "doc-a1b2c3d4",
    "versionSeq": 1,
    "maxPlaces": 500,
    "creatorEmail": "auteur@etudiant.fr"
  }
  ```
* **Réponse (HTTP 201 Created) :**
  ```json
  {
    "message": "Lien de téléchargement public créé avec succès",
    "linkId": "revue-7f8a9b",
    "publicUrl": "/download/revue-7f8a9b",
    "maxPlaces": 500,
    "places_restantes": 500
  }
  ```

---

### `GET /api/download/:linkId` *(Chemin critique sous pic de 15 000 requêtes)*
Point d'entrée du Gatekeeper. Décrémente de manière atomique le quota en base NoSQL ($O(1) < 10$\,ms).

* **Cas 1 : Place attribuée (HTTP 200 OK)**
  ```json
  {
    "status": "ADMITTED",
    "message": "Place attribuée avec succès !",
    "remaining": 499,
    "token": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "pdfStatus": "READY",
    "downloadUrl": "/api/download/file?token=3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "latencyMs": 8
  }
  ```

* **Cas 2 : Quota épuisé (HTTP 410 Gone)**
  Renvoyé immédiatement dès que les 500 exemplaires ont été attribués.
  ```json
  {
    "error": "QUOTA_EXHAUSTED",
    "message": "Le quota de 500 exemplaires a été atteint. Ce document n'est plus téléchargeable.",
    "remaining": 0,
    "latencyMs": 6
  }
  ```

---

### `GET /api/download/file?token={one_time_token}`
Téléchargement du fichier PDF finalisé.
* **Règle de sécurité stricte :** Le jeton est **brûlé dès le premier appel** (invalidation atomique).
* **Réponse nominale :** Flux binaire `application/pdf` avec en-tête `Content-Disposition: attachment; filename="revue_doc_...pdf"`.
* **Tentative de rejeu ou partage :** `HTTP 403 Forbidden` (`INVALID_OR_CONSUMED_TOKEN`).

---

## 4. Endpoints d'Administration et Supervision

### `GET /api/admin/dashboard`
Permet à l'association de consulter l'état de l'application en temps réel (Sujet §1).
* **Réponse (HTTP 200 OK) :**
  ```json
  {
    "timestamp": "2026-10-25T08:30:00.000Z",
    "summary": {
      "totalOpenDocuments": 1,
      "totalActiveLinks": 1,
      "totalBlockedUsers": 0
    },
    "openDocuments": [
      {
        "docId": "doc-a1b2c3d4",
        "connectedWriters": 3,
        "textLength": 4820
      }
    ],
    "activeLinks": [
      {
        "linkId": "revue-7f8a9b",
        "places_restantes": 342,
        "maxPlaces": 500,
        "pdfStatus": "READY"
      }
    ],
    "blockedUsers": []
  }
  ```

---

## 5. Protocole WebSocket de Collaboration (`/ws/:docId`)

* **URL :** `ws://<host>:1234/ws/<docId>?email=<email>&name=<nom>`
* **Frames binaires échangées :**
  * `Tag 0` : Delta Yjs (`Uint8Array`) de mise à jour textuelle CRDT.
  * `Tag 1` : Message de présence et coordonnées du curseur (*Awareness*).
* **Frames JSON émises par le serveur :**
  * `QUOTA_STATUS` : Solde de caractères du jour (`{ used, limit: 10000, remaining }`).
  * `QUOTA_UPDATE` : Mise à jour du solde après frappe acceptée.
  * `ERROR_QUOTA_EXCEEDED` : Avertissement de dépassement du quota de 10 000 car. (la frappe est annulée).
  * `ERROR_BLOCKED` : Notification de blocage temporaire (15 min) suite à acharnement répété.
  * `VERSION_RESTORED` : Notification d'application d'un instantané historique.
