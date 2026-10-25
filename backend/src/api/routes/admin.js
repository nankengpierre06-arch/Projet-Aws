/**
 * Routes d'Administration de l'Association
 * - Gestion et création des comptes des rédacteurs (Sujet)
 * - Supervision temps réel des documents, liens et blocages
 * - Déblocage manuel des utilisateurs pénalisés
 */
const express = require('express');
const router = express.Router();
const storage = require('../../aws/storage-adapter');
const collabServer = require('../../collab/server');

// 1. Tableau de bord global de supervision
router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await storage.getAssociationDashboard(collabServer.docs);
    return res.json(dashboard);
  } catch (err) {
    console.error(`[Admin] Erreur dashboard : ${err.message}`);
    return res.status(500).json({ error: 'DASHBOARD_ERROR', message: err.message });
  }
});

// 2. Création d'un compte rédacteur par l'administrateur
router.post('/writers', async (req, res) => {
  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Nom et e-mail sont obligatoires pour créer un rédacteur.' });
  }

  const result = await storage.createWriter(email, name);
  if (!result.success) {
    return res.status(409).json({ error: result.reason, message: result.message });
  }

  return res.status(201).json({
    message: `Compte rédacteur créé avec succès pour ${name} (${email})`,
    writer: result.writer
  });
});

// 3. Liste de tous les rédacteurs enregistrés
router.get('/writers', async (req, res) => {
  try {
    const writers = await storage.listWriters();
    return res.json({ total: writers.length, writers });
  } catch (err) {
    return res.status(500).json({ error: 'FETCH_ERROR', message: err.message });
  }
});

// 4. Suppression d'un rédacteur
router.delete('/writers/:email', async (req, res) => {
  const { email } = req.params;
  const result = await storage.deleteWriter(email);
  if (!result.success) {
    return res.status(400).json({ error: 'CANNOT_DELETE', message: result.message || 'Impossible de supprimer.' });
  }
  return res.json({ message: `Rédacteur ${email} retiré.` });
});

// 5. Déblocage manuel d'un utilisateur
router.post('/unblock', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'MISSING_EMAIL' });
  }
  const result = await storage.unblockUser(email);
  return res.json(result);
});

module.exports = router;
