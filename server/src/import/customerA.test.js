const { test } = require('node:test');
const assert = require('node:assert');
const { importClients, normalizeDate } = require('./customerA');

test('normalizeDate converts MM/DD/YYYY to ISO', () => {
  assert.strictEqual(normalizeDate('01/15/2023'), '2023-01-15');
  assert.strictEqual(normalizeDate('2023-01-15'), null);
});

test('importClients maps every Customer A client with no rejects', () => {
  const { clients, rejected } = importClients();
  assert.strictEqual(rejected.length, 0);
  assert.ok(clients.length >= 10);
  const first = clients[0];
  assert.strictEqual(first.id, 'C001');
  assert.strictEqual(first.status, 'active');
  assert.strictEqual(first.entityType, 'corporation');
  assert.strictEqual(first.startDate, '2023-01-15');
  assert.strictEqual(first.annualRevenue, 2500000);
});

test('importClients maps selected CSV text and rejects a missing client ID', () => {
  const csvText = [
    'Client ID,Client Name,Business Type,Status,Date Onboarded',
    'DEMO-1,Selected Client,LLC,Active,10/27/2026',
    ',Missing ID,LLC,Active,10/27/2026'
  ].join('\n');
  const { clients, rejected } = importClients(csvText);
  assert.strictEqual(clients.length, 1);
  assert.strictEqual(clients[0].id, 'DEMO-1');
  assert.strictEqual(clients[0].name, 'Selected Client');
  assert.strictEqual(clients[0].entityType, 'llc');
  assert.strictEqual(clients[0].annualRevenue, null);
  assert.strictEqual(rejected.length, 1);
  assert.ok(rejected[0].errors.includes('Missing Client ID'));
});
