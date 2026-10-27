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
