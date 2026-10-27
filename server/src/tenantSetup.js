/**
 * Tenant setup (happy path): provision a customer's pending tenant on a plan,
 * then mark the Tenant Setup onboarding step completed.
 */

const { calculateProgress } = require('./models');

const PLANS = ['starter', 'professional', 'enterprise'];
const TENANT_SETUP_STEP = 'Tenant Setup';

/** @returns {{ error?: {status: number, message: string}, tenant?: object, onboarding?: object }} */
function provisionTenant(store, customerId, plan) {
  const tenant = store.getTenantByCustomerId(customerId);
  if (!tenant) return { error: { status: 404, message: 'Tenant not found' } };
  if (tenant.status === 'active') return { error: { status: 409, message: 'Tenant is already active' } };

  const chosenPlan = plan || tenant.plan;
  if (!PLANS.includes(chosenPlan)) {
    return { error: { status: 400, message: `Plan must be one of: ${PLANS.join(', ')}` } };
  }

  const updatedTenant = store.updateTenant(customerId, { status: 'active', plan: chosenPlan });
  const state = store.getOnboardingState(customerId);
  const steps = state.steps.map(s => (s.name === TENANT_SETUP_STEP ? { ...s, status: 'completed' } : s));
  const onboarding = store.updateOnboardingState(customerId, { steps, progressPercent: calculateProgress(steps) });
  return { tenant: updatedTenant, onboarding };
}

module.exports = { provisionTenant, PLANS };
