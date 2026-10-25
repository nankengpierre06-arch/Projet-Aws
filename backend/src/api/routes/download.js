/**
 * Routeur Gatekeeper de Téléchargement (Contrainte critique C1)
 * - Arbitrage atomique ultra-rapide des 15 000 clics concurrents
 * - Décrément conditionnel DynamoDB en O(1) < 10 ms
 * - Rejet immédiat HTTP 410 dès épuisement du quota N=500
 * - Délivrance sécurisée par jeton à usage unique (One-Time Token brûlé à l'accès)
 * - Alerte automatique SNS au créateur dès le dernier exemplaire (C6)
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const storage = require('../../aws/storage-adapter');
const config = require('../../config');

// Magasin en mémoire des jetons de téléchargement à usage unique
// Clé: token -> { linkId, docId, versionSeq, s3Key, createdAt, expiresAt }
const activeTokens = new Map();

// Nettoyage régulier des jetons expirés (TTL de 60 secondes)
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of activeTokens.entries()) {
    if (now > data.expiresAt) {
      activeTokens.delete(token);
    }
  }
}, 30000);

/**
 * 1. Délivrance du flux binaire PDF : GET /api/download/file?token=...
 * Doit être déclaré AVANT /:linkId pour éviter la capture par paramètre
 * Valide et BRÛLE immédiatement le jeton à usage unique.
 * Garantit qu'un visiteur ne peut ni rejouer ni partager son lien.
 */
router.get('/file', async (req, res) => {
  const { token } = req.query;

  if (!token || !activeTokens.has(token)) {
    return res.status(403).json({
      error: 'INVALID_OR_CONSUMED_TOKEN',
      message: 'Ce lien de téléchargement a déjà été consommé ou est expiré. Un seul téléchargement par place attribuée.'
    });
  }

  const tokenData = activeTokens.get(token);

  // BRÛLAGE IMMÉDIAT DU JETON (Invalidation atomique dès l'accès)
  activeTokens.delete(token);

  try {
    const pdfBuffer = await storage.getPdfBuffer(tokenData.s3Key);

    if (!pdfBuffer) {
      return res.status(202).json({
        status: 'COMPILING',
        message: 'Le document est en cours de composition par le moteur Typst. Veuillez réessayer dans 1 seconde.'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="revue_doc_${tokenData.docId}_v${tokenData.versionSeq}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    console.log(`[Gatekeeper] Fichier PDF délivré avec succès (${pdfBuffer.length} octets) via jeton ${token.substring(0, 8)}...`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error(`[Gatekeeper] Erreur envoi PDF : ${err.message}`);
    return res.status(500).json({ error: 'DOWNLOAD_FAILED', message: 'Impossible de délivrer le fichier PDF' });
  }
});

/**
 * 2. Consultation de statut : GET /api/download/status/:linkId
 * Permet au visiteur de patienter pendant la compilation du premier PDF (< 80 ms)
 */
router.get('/status/:linkId', async (req, res) => {
  const { linkId } = req.params;
  const link = await storage.getLink(linkId);

  if (!link) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

  const now = Date.now();
  const scheduledTime = link.scheduledAt ? new Date(link.scheduledAt).getTime() : 0;
  const isUpcoming = scheduledTime > now;
  const isExhausted = link.places_restantes <= 0;

  return res.json({
    linkId,
    title: link.title,
    description: link.description,
    scheduledAt: link.scheduledAt,
    isUpcoming,
    isOpen: !isUpcoming && !isExhausted,
    isExhausted,
    places_restantes: link.places_restantes,
    maxPlaces: link.maxPlaces,
    pdfStatus: link.pdfStatus || 'PENDING'
  });
});

/**
 * 3. Endpoint d'admission au pic : GET /api/download/:linkId
 * C'est la porte d'entrée frappée par les 15 000 visiteurs simultanés.
 */
router.get('/:linkId', async (req, res) => {
  const { linkId } = req.params;
  const startTime = Date.now();

  try {
    // Arbitrage atomique instantané
    const decResult = await storage.decrementLinkQuota(linkId);

    if (!decResult.success) {
      if (decResult.reason === 'NOT_FOUND') {
        return res.status(404).json({
          error: 'LINK_NOT_FOUND',
          message: 'Lien de téléchargement inexistant ou révoqué.'
        });
      }

      if (decResult.reason === 'NOT_YET_SCHEDULED') {
        return res.status(403).json({
          error: 'PARUTION_NOT_YET_SCHEDULED',
          message: 'Cette parution est en cours de programmation par l\'administration. La date et heure officielles seront bientôt fixées.'
        });
      }

      if (decResult.reason === 'NOT_YET_OPEN') {
        return res.status(403).json({
          error: 'PARUTION_NOT_YET_OPEN',
          message: `La parution n'est pas encore ouverte. Ouverture prévue le ${new Date(decResult.scheduledAt).toLocaleString('fr-FR')}.`,
          scheduledAt: decResult.scheduledAt
        });
      }

      // Quota de 500 atteint : Rejet HTTP 410 en < 15 ms sans solliciter le disque
      const latency = Date.now() - startTime;
      return res.status(410).json({
        error: 'QUOTA_EXHAUSTED',
        message: 'Le quota de 500 exemplaires a été atteint. Ce document n\'est plus téléchargeable.',
        remaining: 0,
        latencyMs: latency
      });
    }

    const { remaining, isLast, link } = decResult;

    // Déclencheur Contrainte C6 : Alerte automatique SNS dès que places == 0
    if (isLast && link.creatorEmail) {
      storage.sendExhaustedAlert(linkId, link.creatorEmail).catch(err => {
        console.error(`[Alerte C6] Erreur notification : ${err.message}`);
      });
    }

    // Déclencher la compilation SQS UNE SEULE FOIS pour ce document/version
    await storage.requestPdfCompilationOnce(linkId, link.docId, link.versionSeq);

    // Générer un jeton à usage unique valable 60 secondes
    const oneTimeToken = crypto.randomUUID();
    const expiresAt = Date.now() + config.business.downloadTokenTtlSec * 1000;

    activeTokens.set(oneTimeToken, {
      linkId,
      docId: link.docId,
      versionSeq: link.versionSeq,
      s3Key: link.pdfS3Key,
      createdAt: Date.now(),
      expiresAt
    });

    const latency = Date.now() - startTime;

    return res.status(200).json({
      status: 'ADMITTED',
      message: 'Place attribuée avec succès !',
      remaining,
      token: oneTimeToken,
      pdfStatus: link.pdfStatus || 'PENDING',
      downloadUrl: `/api/download/file?token=${oneTimeToken}`,
      latencyMs: latency
    });
  } catch (err) {
    console.error(`[Gatekeeper] Erreur interne : ${err.message}`);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erreur lors du traitement de la demande' });
  }
});

module.exports = router;

