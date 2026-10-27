const { test } = require('node:test');
const assert = require('node:assert');
const store = require('./data/store');
const { validateIntake, registerCustomer } = require('./intake');
const { provisionTenant } = require('./tenantSetup');

function newCustomer() {
  const { value } = validateIntake({ name: 'Initech', industry: 'Software', region: 'NA', contactEmail: 'a@initech.example' });
  return registerCustomer(store, value).customer;
}

test('provisionTenant activates tenant on chosen plan and completes the step', () => {
  const c = newCustomer();
  const { tenant, onboarding, error } = provisionTenant(store, c.id, 'enterprise');
  assert.strictEqual(error, undefined);
  assert.strictEqual(tenant.status, 'active');
  assert.strictEqual(tenant.plan, 'enterprise');
  assert.strictEqual(onboarding.steps.find(s => s.name === 'Tenant Setup').status, 'completed');
  assert.strictEqual(onboarding.progressPercent, 50);
});

test('provisionTenant rejects unknown customer, bad plan and double provisioning', () => {
  assert.strictEqual(provisionTenant(store, 'nope').error.status, 404);
  const c = newCustomer();
  assert.strictEqual(provisionTenant(store, c.id, 'gold').error.status, 400);
  provisionTenant(store, c.id);
  assert.strictEqual(provisionTenant(store, c.id).error.status, 409);
});
