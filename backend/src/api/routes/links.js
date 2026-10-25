/**
 * Routes de gestion des liens de partage et quotas de téléchargement
 * Conforme aux exigences fonctionnelles EF03, EF04, EF05 et Contrainte C1
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const storage = require('../../aws/storage-adapter');
const config = require('../../config');

// Création d'un lien de partage avec quota N (défaut N=500, C1)
router.post('/', async (req, res) => {
  const {
    docId,
    versionSeq = 1,
    maxPlaces = config.business.maxDownloadsDefault,
    creatorEmail = 'auteur@etudiant.fr'
  } = req.body;

  if (!docId) {
    return res.status(400).json({ error: 'MISSING_DOC_ID', message: 'docId est obligatoire' });
  }

  const linkId = `revue-${crypto.randomBytes(4).toString('hex')}`;
  const link = await storage.createDownloadLink(linkId, docId, versionSeq, maxPlaces, creatorEmail);

  return res.status(201).json({
    message: 'Lien de téléchargement public créé avec succès',
    linkId,
    publicUrl: `/download/${linkId}`,
    maxPlaces: link.maxPlaces,
    places_restantes: link.places_restantes,
    creatorEmail: link.creatorEmail
  });
});

// Récupération des informations d'un lien
router.get('/:linkId', async (req, res) => {
  const { linkId } = req.params;
  const link = await storage.getLink(linkId);

  if (!link) {
    return res.status(404).json({ error: 'LINK_NOT_FOUND' });
  }

  return res.json(link);
});

module.exports = router;
