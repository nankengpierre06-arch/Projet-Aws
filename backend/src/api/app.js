/**
 * Application Express principale (API REST & Gatekeeper)
 */
const express = require('express');
const cors = require('cors');

const authRouter = require('./routes/auth');
const downloadRouter = require('./routes/download');
const documentsRouter = require('./routes/documents');
const linksRouter = require('./routes/links');
const adminRouter = require('./routes/admin');

const path = require('path');
const storage = require('../aws/storage-adapter');

const app = express();

app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du frontend construit (dist)
const distPath = path.resolve(__dirname, '../../../frontend/dist');
app.use(express.static(distPath));

// Point de contrôle de santé (Healthcheck)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Revue API & Gatekeeper',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Revue API & Gatekeeper',
    timestamp: new Date().toISOString()
  });
});

// Endpoint public pour les documents et parutions en production
app.get('/api/publications', async (req, res) => {
  const publications = await storage.listPublicPublications();
  res.json(publications);
});

// Montage des routes
app.use('/api/auth', authRouter);
app.use('/api/download', downloadRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/links', linksRouter);
app.use('/api/admin', adminRouter);

// Fallback pour le routage frontend (SPA)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Route API introuvable' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

module.exports = app;
