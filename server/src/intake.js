/**
 * Customer intake: validate submitted customer info and register the customer
 * with a pending tenant and an onboarding state whose first step is done.
 */

const { createCustomer, createTenant, createDefaultOnboardingSteps, calculateProgress } = require('./models');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @returns {{ value: object, errors: Record<string,string> }} */
function validateIntake(input = {}) {
  const value = {
    name: String(input.name ?? '').trim(),
    industry: String(input.industry ?? '').trim(),
    region: String(input.region ?? '').trim(),
    contactEmail: String(input.contactEmail ?? '').trim().toLowerCase()
  };
  const errors = {};
  if (!value.name) errors.name = 'Name is required';
  if (!value.industry) errors.industry = 'Industry is required';
  if (!value.region) errors.region = 'Region is required';
  if (!value.contactEmail) errors.contactEmail = 'Contact email is required';
  else if (!EMAIL_RE.test(value.contactEmail)) errors.contactEmail = 'Contact email is not a valid email address';
  return { value, errors };
}

/** Registers a validated customer in the store. Returns { customer, tenant, onboarding }. */
function registerCustomer(store, value) {
  const customer = store.addCustomer(createCustomer(value));
  const tenant = store.addTenant(createTenant({ customerId: customer.id }));
  const steps = createDefaultOnboardingSteps().map(s =>
    s.order === 1 ? { ...s, status: 'completed' } : s
  );
  const onboarding = store.addOnboardingState({
    customerId: customer.id,
    steps,
    progressPercent: calculateProgress(steps)
  });
  return { customer, tenant, onboarding };
}

module.exports = { validateIntake, registerCustomer };
