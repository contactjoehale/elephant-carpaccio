const path = require('path');

const filePath = path.resolve(__dirname, '../../../sample-data/CustomerA_ABCAccounting/clients.csv');
const mappings = [
  { source: 'Client ID', target: 'clientId' },
  { source: 'Client Name', target: 'name' }
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      row.push(cell);
      if (row.length > 1 || row[0].trim()) rows.push(row);
      row = [];
      cell = '';
      if (char === '\r' && text[i + 1] === '\n') i += 1;
    } else {
      cell += char;
    }
  }

  if (quoted) throw new Error('CSV has an unfinished quoted value');
  row.push(cell);
  if (row.length > 1 || row[0].trim()) rows.push(row);
  return rows;
}

function previewAbcClients(csvText, sourceName = 'ABC Accounting clients.csv') {
  const [header, ...dataRows] = parseCsv(csvText);
  if (!header) throw new Error('CSV is empty');

  const columns = header.map(value => value.replace(/^\uFEFF/, '').trim());
  const idIndex = columns.indexOf('Client ID');
  const nameIndex = columns.indexOf('Client Name');
  if (idIndex < 0 || nameIndex < 0) {
    throw new Error('CSV must contain Client ID and Client Name columns');
  }

  const rows = dataRows.map((values, index) => {
    const clientId = (values[idIndex] || '').trim();
    const name = (values[nameIndex] || '').trim();
    const errors = [];
    if (!clientId) errors.push('Missing Client ID');
    if (!name) errors.push('Missing Client Name');
    return { rowNumber: index + 2, clientId, name, errors };
  });

  return {
    sourceName,
    mappings,
    totalRows: rows.length,
    readyCount: rows.filter(row => row.errors.length === 0).length,
    errorCount: rows.filter(row => row.errors.length > 0).length,
    rows
  };
}

module.exports = { filePath, previewAbcClients };
