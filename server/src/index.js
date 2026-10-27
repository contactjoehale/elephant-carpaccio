const express = require('express');
const cors = require('cors');
const { readFile } = require('fs/promises');
const store = require('./data/store');
const { filePath, previewAbcClients } = require('./mapping/abcClients');
const { importClients } = require('./import/customerA');
const { validateIntake, registerCustomer } = require('./intake');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Preview the first sample client file before import
app.get('/api/sample-data/abc/clients/preview', async (req, res) => {
  try {
    const csvText = await readFile(filePath, 'utf8');
    res.json(previewAbcClients(csvText));
  } catch (error) {
    console.error('Could not preview ABC clients:', error);
    res.status(500).json({ error: 'Could not preview the ABC Accounting clients file' });
  }
});

app.post('/api/client-imports/preview', (req, res) => {
  try {
    if (typeof req.body?.csvText !== 'string' || !req.body.csvText.trim()) {
      return res.status(400).json({ error: 'Choose a CSV file' });
    }
    res.json(previewAbcClients(req.body.csvText, req.body.fileName || 'Selected CSV'));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all customers
app.get('/api/customers', (req, res) => {
  res.json(store.getCustomers());
});

// Customer intake: validate and register a new customer
app.post('/api/customers', (req, res) => {
  const { value, errors } = validateIntake(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ errors });
  }
  res.status(201).json(registerCustomer(store, value));
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

// Imported (canonical) clients
app.get('/api/clients', (req, res) => {
  res.json(store.getClients());
});

// Import Customer A (ABC Accounting) clients.csv
app.post('/api/import/customer-a/clients', (req, res) => {
  try {
    const selectedCsv = req.body?.csvText;
    if (selectedCsv !== undefined && (typeof selectedCsv !== 'string' || !selectedCsv.trim())) {
      return res.status(400).json({ error: 'Choose a CSV file' });
    }
    const { clients, rejected } = importClients(selectedCsv);
    const existing = store.getClients();
    const existingIds = new Set(existing.map(client => client.id));
    const added = clients.filter(client => {
      if (existingIds.has(client.id)) return false;
      existingIds.add(client.id);
      return true;
    });
    store.setClients([...existing, ...added]);
    res.json({
      imported: added.length,
      skipped: clients.length - added.length,
      rejected,
      clients: store.getClients()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Onboarding API server running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});
