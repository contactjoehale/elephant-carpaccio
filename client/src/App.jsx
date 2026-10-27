import React, { useState, useEffect } from 'react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'customer-info', label: 'Customer Info' },
  { id: 'data-mapping', label: 'Data Mapping' },
  { id: 'tenant-setup', label: 'Tenant Setup' },
  { id: 'import', label: 'Import' }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [onboardingData, setOnboardingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/onboarding')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid response format');
        return data;
      })
      .then(data => {
        setOnboardingData(data);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch onboarding data:', err);
        setError(err.message);
        setOnboardingData([]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Onboarding Dashboard</h1>
        <p>Customer Success Team - Internal Tool</p>
      </header>

      <nav className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'dashboard' && (
          <DashboardTab data={onboardingData} loading={loading} error={error} />
        )}
        {activeTab === 'customer-info' && (
          <PlaceholderTab title="Customer Info" description="Collect and validate customer information" />
        )}
        {activeTab === 'data-mapping' && (
          <DataMappingTab />
        )}
        {activeTab === 'tenant-setup' && (
          <PlaceholderTab title="Tenant Setup" description="Provision and configure customer tenant" />
        )}
        {activeTab === 'import' && (
          <PlaceholderTab title="Import" description="Import customer data into the platform" />
        )}
      </main>
    </div>
  );
}

function DashboardTab({ data, loading, error }) {
  if (loading) {
    return <div className="placeholder"><p>Loading...</p></div>;
  }

  if (error) {
    return (
      <div className="placeholder">
        <p style={{ color: '#dc2626' }}>⚠️ Failed to load onboarding data</p>
        <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="placeholder"><p>No customers in the onboarding queue</p></div>;
  }

  return (
    <div>
      <h2>Onboarding Queue</h2>
      <p style={{ color: '#6b7280', marginBottom: '20px' }}>
        {data.length} customer(s) awaiting onboarding
      </p>

      {data.map(item => (
        <div key={item.customerId} className="customer-card">
          <h3>{item.customerName}</h3>
          <div className="customer-meta">
            <span>📍 {item.customerRegion}</span>
            <span>🏭 {item.customerIndustry}</span>
          </div>

          <div className="progress-section">
            <ProgressBar percent={item.progressPercent} />
            <Checklist steps={item.steps} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ percent }) {
  return (
    <div className="progress-bar-container">
      <div 
        className="progress-bar" 
        style={{ width: `${Math.max(percent, 0)}%` }}
      >
        {percent > 0 ? `${percent}%` : ''}
      </div>
    </div>
  );
}

function Checklist({ steps }) {
  return (
    <ul className="checklist">
      {steps.map(step => (
        <li key={step.id}>
          <span className={`step-status ${step.status}`}>
            {step.status === 'completed' ? '✓' : step.order}
          </span>
          <span>{step.name}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#9ca3af' }}>
            {step.status.replace('_', ' ')}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DataMappingTab() {
  const [preview, setPreview] = useState(null);
  const [csvText, setCsvText] = useState(null);
  const [fileName, setFileName] = useState('');
  const [importedClients, setImportedClients] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/client-imports')
      .then(async response => {
        if (!response.ok) throw new Error('Could not load imported clients');
        return response.json();
      })
      .then(setImportedClients)
      .catch(err => setError(err.message));
  }, []);

  async function selectFile(event) {
    const file = event.target.files?.[0];
    setPreview(null);
    setCsvText(null);
    setFileName(file?.name || '');
    setError(null);
    setNotice(null);
    if (!file) return;

    setBusy(true);
    try {
      const text = await file.text();
      const response = await fetch('/api/client-imports/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: text, fileName: file.name })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCsvText(text);
      setPreview(data);
    } catch (err) {
      setError(err.message || 'Could not preview this file');
    } finally {
      setBusy(false);
    }
  }

  async function importFirstClient() {
    if (!csvText || !preview) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/client-imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, fileName })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setImportedClients(clients => [...clients, data]);
      setNotice(`Imported ${data.clientId}: ${data.name}`);
    } catch (err) {
      setError(err.message || 'Could not import this client');
    } finally {
      setBusy(false);
    }
  }

  const first = preview?.rows[0];
  const alreadyImported = first && importedClients.some(client => client.clientId === first.clientId);

  return (
    <section className="mapping-preview">
      <h2>Data Mapping</h2>
      <p>Choose an ABC Accounting clients CSV. This first slice checks IDs and names, then imports one client.</p>
      <div className="mapping-controls">
        <label htmlFor="client-csv">Client CSV</label>
        <input id="client-csv" type="file" accept=".csv,text/csv" onChange={selectFile} />
        <button type="button" onClick={importFirstClient} disabled={busy || !first || first.errors.length > 0 || alreadyImported}>
          {busy ? 'Working...' : 'Import first client'}
        </button>
      </div>
      {error && <p role="alert" className="mapping-error">{error}</p>}
      {notice && <p role="status" className="mapping-success">{notice}</p>}
      {alreadyImported && <p role="status">The first client in this file is already imported.</p>}
      {preview && (
        <>
          <h3>Preview: {preview.sourceName}</h3>
          <div className="mapping-columns" aria-label="Column mapping">
            {preview.mappings.map(mapping => (
              <span key={mapping.target}>{mapping.source} → {mapping.target}</span>
            ))}
          </div>
          <p className="mapping-summary">
            {preview.totalRows} rows · {preview.readyCount} ID/name ready · {preview.errorCount} need attention
          </p>
          <p>Only the first data row will be imported in this slice.</p>
          <div className="mapping-table-container">
            <table>
              <thead><tr><th>CSV row</th><th>Client ID</th><th>Name</th><th>Result</th></tr></thead>
              <tbody>
                {preview.rows.map(row => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{row.clientId || '—'}</td>
                    <td>{row.name || '—'}</td>
                    <td>{row.errors.length ? row.errors.join(', ') : 'Ready'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="imported-clients">
        <h3>Imported clients</h3>
        {importedClients.length === 0 ? <p>No clients imported yet.</p> : (
          <ul>{importedClients.map(client => <li key={client.clientId}>{client.clientId} — {client.name}</li>)}</ul>
        )}
      </div>
    </section>
  );
}

function PlaceholderTab({ title, description }) {
  return (
    <div className="placeholder">
      <h2>{title}</h2>
      <p>{description}</p>
      <p style={{ marginTop: '20px', fontSize: '0.9rem' }}>
        🚧 This section is ready to be built
      </p>
    </div>
  );
}

export default App;
