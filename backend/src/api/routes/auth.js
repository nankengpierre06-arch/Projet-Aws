/**
 * Routes d'Authentification Déclarative et Contrôle des Rôles
 * - ADMIN : Accès supervision, création des comptes rédacteurs
 * - WRITER : Accès éditeur collaboratif, décompte 10k caractères
 * - VISITOR : Accès direct libre au téléchargement sans compte
 */
const express = require('express');
const router = express.Router();
const storage = require('../../aws/storage-adapter');

// Connexion / Identification déclarative
router.post('/login', async (req, res) => {
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'MISSING_EMAIL', message: 'L\'adresse e-mail est obligatoire.' });
  }

  // Vérifier si la personne est bloquée
  const isBlocked = await storage.isUserBlocked(email);
  if (isBlocked.blocked) {
    return res.status(403).json({
      error: 'USER_BLOCKED',
      message: `Votre compte est temporairement bloqué pour acharnement jusqu'à ${isBlocked.blockedUntil}.`,
      blockedUntil: isBlocked.blockedUntil
    });
  }

  const authResult = await storage.authenticateUser(email, name);

  if (!authResult.authenticated) {
    return res.status(401).json({
      error: 'ACCOUNT_NOT_FOUND',
      message: authResult.message
    });
  }

  return res.json({
    message: 'Authentification réussie',
    user: authResult.user
  });
});

// Vérification de session active
router.get('/me', async (req, res) => {
  const email = req.query.email || req.headers['x-user-email'];
  if (!email) {
    return res.status(401).json({ error: 'NOT_AUTHENTICATED' });
  }

  const authResult = await storage.authenticateUser(email);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: 'SESSION_INVALID' });
  }

  return res.json({ user: authResult.user });
});

module.exports = router;
