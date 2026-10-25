/**
 * Routes de gestion des documents, partages et versions
 * Conforme aux exigences fonctionnelles EF01, EF02, EF06, EF07 et Contrainte C3
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const storage = require('../../aws/storage-adapter');
const collabServer = require('../../collab/server');

// 1. Liste des documents d'un utilisateur (Documents créés + Documents partagés)
router.get('/user/:email', async (req, res) => {
  const { email } = req.params;
  const docs = await storage.getUserDocuments(email);
  return res.json(docs);
});

// Notifications de l'utilisateur
router.get('/notifications/:email', async (req, res) => {
  const { email } = req.params;
  const notifs = await storage.getUserNotifications(email);
  return res.json(notifs);
});

router.post('/notifications/:email/read', async (req, res) => {
  const { email } = req.params;
  const result = await storage.markNotificationsRead(email);
  return res.json(result);
});

// 2. Création d'un nouveau document collaboratif (EF01)
router.post('/', async (req, res) => {
  const { title = 'Nouvelle Revue', ownerEmail = 'redacteur-chef@etudiant.fr' } = req.body;
  const docId = `doc-${crypto.randomBytes(4).toString('hex')}`;

  const doc = await storage.saveDocumentMetadata(docId, title, ownerEmail);
  return res.status(201).json({
    message: 'Document créé avec succès',
    docId,
    document: doc
  });
});

// 3. Récupération des métadonnées d'un document
router.get('/:docId', async (req, res) => {
  const { docId } = req.params;
  const doc = await storage.getDocumentMetadata(docId);
  if (!doc) {
    return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
  }
  return res.json(doc);
});

// 4. Partage des droits d'écriture à d'autres rédacteurs (EF02 - Sujet §1)
router.post('/:docId/shares', async (req, res) => {
  const { docId } = req.params;
  const { email, inviterEmail } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'MISSING_EMAIL', message: 'L\'adresse email est obligatoire pour le partage' });
  }

  const updatedDoc = await storage.addCollaborator(docId, email, inviterEmail);
  if (!updatedDoc) {
    return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
  }

  return res.status(200).json({
    message: `Droits d'écriture accordés à ${email}`,
    docId,
    authorizedWriters: updatedDoc.authorizedWriters
  });
});

// 4. Création d'une version figée / Instantané T1 (EF06)
router.post('/:docId/versions', async (req, res) => {
  const { docId } = req.params;
  const { label = 'Instantané figé', authorEmail = 'admin@etudiant.fr' } = req.body;

  const doc = await storage.getDocumentMetadata(docId);
  if (!doc) {
    return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
  }

  // Récupérer le contenu textuel actuel du document depuis le serveur de collab
  const currentContent = collabServer.getDocContent(docId);

  const nextVersion = (doc.currentVersion || 1) + 1;
  doc.currentVersion = nextVersion;
  await storage.saveDocumentMetadata(docId, doc.title, doc.ownerEmail);

  // Sauvegarder la version
  const versionItem = await storage.saveVersionSnapshot(docId, nextVersion, currentContent, authorEmail, label);

  return res.status(201).json({
    message: 'Nouvelle version figée créée (Instantané T1)',
    docId,
    versionSeq: nextVersion,
    label: versionItem.label,
    charLength: currentContent.length,
    createdAt: versionItem.createdAt
  });
});

// 5. Consultation de la liste des versions précédentes (EF06)
router.get('/:docId/versions', async (req, res) => {
  const { docId } = req.params;
  const versions = await storage.listVersions(docId);
  return res.json({
    docId,
    totalVersions: versions.length,
    versions
  });
});

// 6. Restauration d'une version précédente (EF07 - Sujet §1)
router.post('/:docId/restore/:versionSeq', async (req, res) => {
  const { docId, versionSeq } = req.params;
  const version = await storage.getVersion(docId, versionSeq);

  if (!version) {
    return res.status(404).json({
      error: 'VERSION_NOT_FOUND',
      message: `La version #${versionSeq} n'existe pas pour ce document.`
    });
  }

  // Restauration immédiate en direct dans Yjs et notification des collaborateurs
  collabServer.restoreDocVersion(docId, version.content);

  return res.json({
    message: `Document restauré avec succès à la version #${versionSeq} !`,
    docId,
    restoredVersion: versionSeq,
    contentPreview: version.content ? version.content.substring(0, 100) + '...' : '(vide)'
  });
});

module.exports = router;
