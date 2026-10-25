/**
 * Application Express principale (API REST & Gatekeeper)
 */
const express = require('express');
const cors = require('cors');

const downloadRouter = require('./routes/download');
const documentsRouter = require('./routes/documents');
const linksRouter = require('./routes/links');

const app = express();

app.use(cors());
app.use(express.json());

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

// Montage des routes
app.use('/api/download', downloadRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/links', linksRouter);

module.exports = app;
