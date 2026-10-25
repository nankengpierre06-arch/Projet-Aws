/**
 * Routes de gestion des documents et versions
 * Conforme aux exigences fonctionnelles EF01, EF06, EF07
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const storage = require('../../aws/storage-adapter');

// Création d'un nouveau document collaboratif (EF01)
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

// Récupération des métadonnées d'un document
router.get('/:docId', async (req, res) => {
  const { docId } = req.params;
  const doc = await storage.getDocumentMetadata(docId);
  if (!doc) {
    return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
  }
  return res.json(doc);
});

// Création d'une version figée / Instantané T1 (EF06)
router.post('/:docId/versions', async (req, res) => {
  const { docId } = req.params;
  const { label = 'Snapshot T1', authorEmail = 'admin@etudiant.fr' } = req.body;

  const doc = await storage.getDocumentMetadata(docId);
  if (!doc) {
    return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
  }

  const nextVersion = (doc.currentVersion || 1) + 1;
  doc.currentVersion = nextVersion;
  await storage.saveDocumentMetadata(docId, doc.title, doc.ownerEmail);

  return res.status(201).json({
    message: 'Nouvelle version figée créée (Instantané T1)',
    docId,
    versionSeq: nextVersion,
    label
  });
});

module.exports = router;
