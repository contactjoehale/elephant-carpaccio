const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { filePath, previewAbcClients } = require('./abcClients');

describe('ABC client preview', () => {
  it('maps the bundled client IDs and names', () => {
    const preview = previewAbcClients(readFileSync(filePath, 'utf8'));
    assert.equal(preview.totalRows, 10);
    assert.equal(preview.readyCount, 10);
    assert.equal(preview.errorCount, 0);
    assert.deepEqual(preview.mappings, [
      { source: 'Client ID', target: 'clientId' },
      { source: 'Client Name', target: 'name' }
    ]);
    assert.equal(preview.rows[0].clientId, 'C001');
    assert.equal(preview.rows[0].name, 'Riverside Manufacturing LLC');
  });

  it('flags missing required values without counting the row as ready', () => {
    const preview = previewAbcClients('Client ID,Client Name\n,Missing ID\nC002,\n,\nC003,"Ready, Inc"');
    assert.equal(preview.readyCount, 1);
    assert.equal(preview.errorCount, 3);
    assert.deepEqual(preview.rows[0].errors, ['Missing Client ID']);
    assert.deepEqual(preview.rows[1].errors, ['Missing Client Name']);
    assert.deepEqual(preview.rows[2].errors, ['Missing Client ID', 'Missing Client Name']);
    assert.equal(preview.rows[3].name, 'Ready, Inc');
  });

  it('rejects files without the columns needed for this slice', () => {
    assert.throws(() => previewAbcClients('ID,Name\n1,Example'), /Client ID and Client Name/);
  });
});
