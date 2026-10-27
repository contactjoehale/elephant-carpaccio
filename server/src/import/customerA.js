/**
 * Customer A (ABC Accounting) clients.csv -> canonical Client.
 * Hardcoded mapping for the first vertical slice; no quoted CSV fields in this file.
 */

const fs = require('fs');
const path = require('path');

const CLIENTS_CSV = path.join(__dirname, '../../../sample-data/CustomerA_ABCAccounting/clients.csv');

const STATUS = { Active: 'active', Inactive: 'inactive', Pending: 'pending' };

const ENTITY_TYPE = {
  Corporation: 'corporation',
  'S-Corporation': 's_corporation',
  LLC: 'llc',
  Partnership: 'partnership',
  'Sole Proprietorship': 'sole_proprietor',
  'Non-Profit': 'non_profit'
};

function parseCsv(text) {
  const [header, ...lines] = text.split(/\r?\n/).filter(l => l.trim() !== '');
  const columns = header.split(',');
  return lines.map(line => {
    const cells = line.split(',');
    return Object.fromEntries(columns.map((c, i) => [c, cells[i] ?? '']));
  });
}

// MM/DD/YYYY -> YYYY-MM-DD
function normalizeDate(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}

function mapRow(row) {
  const errors = [];
  const status = STATUS[row['Status']];
  const entityType = ENTITY_TYPE[row['Business Type']];
  const startDate = normalizeDate(row['Date Onboarded']);
  if (!status) errors.push(`Unknown status "${row['Status']}"`);
  if (!entityType) errors.push(`Unknown business type "${row['Business Type']}"`);
  if (!startDate) errors.push(`Bad date "${row['Date Onboarded']}"`);

  return {
    client: {
      id: row['Client ID'],
      name: row['Client Name'],
      entityType,
      status,
      startDate,
      taxId: row['Tax ID'],
      annualRevenue: Number(row['Annual Revenue']),
      industry: row['Industry'],
      paymentTerms: row['Payment Terms'],
      primaryContact: row['Primary Contact']
    },
    errors
  };
}

/** @returns {{ clients: object[], rejected: {row: object, errors: string[]}[] }} */
function importClients() {
  const rows = parseCsv(fs.readFileSync(CLIENTS_CSV, 'utf8'));
  const clients = [];
  const rejected = [];
  for (const row of rows) {
    const { client, errors } = mapRow(row);
    if (errors.length) rejected.push({ row, errors });
    else clients.push(client);
  }
  return { clients, rejected };
}

module.exports = { importClients, parseCsv, mapRow, normalizeDate };
