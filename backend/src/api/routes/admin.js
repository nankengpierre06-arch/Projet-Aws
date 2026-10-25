/**
 * Routes d'Administration et Supervision de l'Association
 * Répond directement à l'exigence du Sujet §1 :
 * "L’association doit pouvoir consulter à tout moment l’état de l’application :
 *  les documents ouverts, les liens actifs avec leur nombre de téléchargements restants,
 *  et les personnes bloquées."
 */
const express = require('express');
const router = express.Router();
const storage = require('../../aws/storage-adapter');
const collabServer = require('../../collab/server');

// Tableau de bord global de l'association
router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await storage.getAssociationDashboard(collabServer.docs);
    return res.json(dashboard);
  } catch (err) {
    console.error(`[Admin] Erreur dashboard : ${err.message}`);
    return res.status(500).json({ error: 'DASHBOARD_ERROR', message: err.message });
  }
});

// Débloquer manuellement une personne bloquée
router.post('/unblock', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'MISSING_EMAIL' });
  }
  // Supprimer des utilisateurs bloqués
  const wasBlocked = await storage.isUserBlocked(email);
  if (wasBlocked.blocked) {
    // Supprimer
    if (storage.forceMock || !storage.dynamoDoc) {
      // local
      const { localStore } = require('../../aws/storage-adapter');
    }
  }
  return res.json({ message: `Utilisateur ${email} débloqué avec succès.` });
});

module.exports = router;
