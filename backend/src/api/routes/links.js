/**
 * Routes de gestion des liens de parution et des publications en production
 * Conforme aux exigences fonctionnelles EF03, EF04, EF05 et Contrainte C1
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const storage = require('../../aws/storage-adapter');
const config = require('../../config');

// 1. Récupération de toutes les parutions en production (Annoncées ou Actives)
router.get('/', async (req, res) => {
  const publications = await storage.listPublicPublications();
  return res.json(publications);
});

router.get('/public', async (req, res) => {
  const publications = await storage.listPublicPublications();
  return res.json(publications);
});

// 2. Création d'un lien de parution avec quota N (défaut N=500) et date/heure annoncée
router.post('/', async (req, res) => {
  const {
    docId,
    versionSeq = 1,
    maxPlaces = config.business.maxDownloadsDefault,
    creatorEmail = 'auteur@etudiant.fr',
    title,
    description,
    scheduledAt
  } = req.body;

  if (!docId) {
    return res.status(400).json({ error: 'MISSING_DOC_ID', message: 'docId est obligatoire' });
  }

  const linkId = `revue-${crypto.randomBytes(4).toString('hex')}`;
  const link = await storage.createDownloadLink(
    linkId,
    docId,
    versionSeq,
    maxPlaces,
    creatorEmail,
    { title, description, scheduledAt }
  );

  return res.status(201).json({
    message: 'Lien de parution créé avec succès',
    linkId,
    publicUrl: `/download/${linkId}`,
    title: link.title,
    description: link.description,
    scheduledAt: link.scheduledAt,
    maxPlaces: link.maxPlaces,
    places_restantes: link.places_restantes,
    creatorEmail: link.creatorEmail
  });
});

// 3. Récupération des informations d'une parution spécifique
router.get('/:linkId', async (req, res) => {
  const { linkId } = req.params;
  const link = await storage.getLink(linkId);

  if (!link) {
    return res.status(404).json({ error: 'LINK_NOT_FOUND', message: 'Parution introuvable' });
  }

  const now = Date.now();
  const scheduledTime = link.scheduledAt ? new Date(link.scheduledAt).getTime() : 0;
  const isUpcoming = scheduledTime > now;
  const isExhausted = link.places_restantes <= 0;

  return res.json({
    ...link,
    isUpcoming,
    isOpen: !isUpcoming && !isExhausted,
    isExhausted
  });
});

// 4. Programmation officielle de la date et heure d'annonce (Réservé à l'Admin)
router.patch('/:linkId/schedule', async (req, res) => {
  const { linkId } = req.params;
  const { scheduledAt, adminEmail = 'admin@etudiant.fr' } = req.body;

  if (!scheduledAt) {
    return res.status(400).json({
      error: 'MISSING_SCHEDULED_AT',
      message: 'La date et l\'heure d\'ouverture annoncée sont obligatoires.'
    });
  }

  const result = await storage.scheduleDownloadLink(linkId, scheduledAt, adminEmail);
  if (!result || !result.success) {
    return res.status(404).json({
      error: 'LINK_NOT_FOUND',
      message: result?.error || 'Parution introuvable.'
    });
  }

  return res.json({
    message: 'Date et heure d\'annonce programmées avec succès par l\'administrateur.',
    linkId,
    link: result.link
  });
});

module.exports = router;
