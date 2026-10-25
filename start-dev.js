const { spawn } = require('child_process');
const path = require('path');

console.log('\x1b[35m%s\x1b[0m', '=======================================================');
console.log('\x1b[35m%s\x1b[0m', ' 🚀 DÉMARRAGE DE LA REVUE COLLABORATIVE (BACK & FRONT) ');
console.log('\x1b[35m%s\x1b[0m', '=======================================================');
console.log('• Backend API & Gatekeeper  : http://localhost:8000');
console.log('• Service WebSocket Yjs     : ws://localhost:1234');
console.log('• Interface Web Frontend    : http://localhost:3000');
console.log('-------------------------------------------------------\n');

const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log('\nArrêt des services...');
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
