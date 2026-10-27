const fs = require('node:fs');
const path = require('node:path');

function loadClients(filePath) {
  try {
    const clients = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(clients)) throw new Error('Saved clients must be a list');
    return clients;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function saveClients(filePath, clients) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(clients, null, 2));
}

module.exports = { loadClients, saveClients };
