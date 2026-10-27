const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadClients, saveClients } = require('./clientPersistence');

test('saved clients are available after loading a new store from disk', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'elephant-clients-'));
  try {
    const filePath = path.join(dir, 'nested', 'clients.json');
    assert.deepEqual(loadClients(filePath), []);
    saveClients(filePath, [{ id: 'C001', name: 'Riverside Manufacturing LLC' }]);
    assert.deepEqual(loadClients(filePath), [{ id: 'C001', name: 'Riverside Manufacturing LLC' }]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
