const { test } = require('node:test');
const assert = require('node:assert');
const { validateIntake, registerCustomer } = require('./intake');
const store = require('./data/store');

test('validateIntake rejects missing fields and bad email', () => {
  const { errors } = validateIntake({ name: '  ', contactEmail: 'nope' });
  assert.deepStrictEqual(Object.keys(errors).sort(), ['contactEmail', 'industry', 'name', 'region']);
});

test('validateIntake trims and lowercases', () => {
  const { value, errors } = validateIntake({
    name: ' Globex ', industry: 'Energy', region: 'EMEA', contactEmail: ' Ops@Globex.Example '
  });
  assert.deepStrictEqual(errors, {});
  assert.strictEqual(value.name, 'Globex');
  assert.strictEqual(value.contactEmail, 'ops@globex.example');
});

test('registerCustomer creates customer, pending tenant and 25% onboarding', () => {
  const { value } = validateIntake({ name: 'Globex', industry: 'Energy', region: 'EMEA', contactEmail: 'ops@globex.example' });
  const { customer, tenant, onboarding } = registerCustomer(store, value);
  assert.strictEqual(store.getCustomerById(customer.id).name, 'Globex');
  assert.strictEqual(tenant.status, 'pending');
  assert.strictEqual(tenant.customerId, customer.id);
  assert.strictEqual(onboarding.progressPercent, 25);
  assert.strictEqual(onboarding.steps[0].status, 'completed');
});
