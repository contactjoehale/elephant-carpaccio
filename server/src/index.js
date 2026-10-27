const express = require('express');
const cors = require('cors');
const store = require('./data/store');
const { previewAbcClients } = require('./mapping/abcClients');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

function previewSelectedCsv(body) {
  if (typeof body?.csvText !== 'string' || !body.csvText.trim()) {
    throw new Error('Choose a CSV file');
  }
  return previewAbcClients(body.csvText, body.fileName || 'Selected CSV');
}

// Read a selected ABC-format CSV without saving anything
app.post('/api/client-imports/preview', (req, res) => {
  try {
    res.json(previewSelectedCsv(req.body));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/client-imports', (req, res) => {
  res.json(store.getImportedClients());
});

// Import exactly one row so CS can verify a complete path before bulk import
app.post('/api/client-imports', (req, res) => {
  let preview;
  try {
    preview = previewSelectedCsv(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const first = preview.rows[0];
  if (!first) return res.status(400).json({ error: 'CSV has no client rows' });
  if (first.errors.length) {
    return res.status(422).json({ error: `Row ${first.rowNumber}: ${first.errors.join(', ')}` });
  }
  if (store.getImportedClientById(first.clientId)) {
    return res.status(409).json({ error: `Client ${first.clientId} has already been imported` });
  }

  const imported = store.addImportedClient({
    clientId: first.clientId,
    name: first.name,
    sourceName: preview.sourceName,
    importedAt: new Date().toISOString()
  });
  res.status(201).json(imported);
});

// Get all customers
app.get('/api/customers', (req, res) => {
  res.json(store.getCustomers());
});

// Get customer by ID
app.get('/api/customers/:id', (req, res) => {
  const customer = store.getCustomerById(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json(customer);
});

// Get onboarding state for a customer
app.get('/api/customers/:id/onboarding', (req, res) => {
  const state = store.getOnboardingState(req.params.id);
  if (!state) {
    return res.status(404).json({ error: 'Onboarding state not found' });
  }
  res.json(state);
});

// Get all onboarding states (dashboard view)
app.get('/api/onboarding', (req, res) => {
  const states = store.getAllOnboardingStates();
  const customers = store.getCustomers();
  
  // Join customer info with onboarding state
  const dashboard = states.map(state => {
    const customer = customers.find(c => c.id === state.customerId);
    return {
      ...state,
      customerName: customer?.name || 'Unknown',
      customerIndustry: customer?.industry || '',
      customerRegion: customer?.region || ''
    };
  });
  
  res.json(dashboard);
});

// Get tenant by customer ID
app.get('/api/tenants/:customerId', (req, res) => {
  const tenant = store.getTenantByCustomerId(req.params.customerId);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  res.json(tenant);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Onboarding API server running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});
