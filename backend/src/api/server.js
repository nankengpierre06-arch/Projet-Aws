/**
 * Point d'entrée autonome du serveur API (Port 8000)
 */
const app = require('./app');
const config = require('../config');

const server = app.listen(config.portApi, () => {
  console.log(`[API Server] Passerelle REST & Gatekeeper à l'écoute sur le port ${config.portApi}`);
});

module.exports = server;
