import React, { useEffect, useMemo, useState } from 'react';

type Overview = {
  users: Array<{ id: string; name: string; mobile: string; role: string; status: string }>;
  trips: Array<{ id: string; currentStatus: string; vehicleNumber: string; driver?: { name: string }; load?: { pickupCity: string; dropCity: string } }>;
  loads: Array<{ id: string; pickupCity: string; dropCity: string; materialType: string; status: string; shipper?: { name: string } }>;
  payments: Array<{ id?: string; razorpayOrderId: string; amountInPaise: number; status: string }>;
  settlements: Array<{ id: string; amountInPaise: number; status: string; reference?: string }>;
  fraudSignals: Array<{ id: string; signalType: string; severity: string; score: number; reason: string }>;
};

const styles: Record<string, React.CSSProperties> = {
  page: { fontFamily: 'system-ui, sans-serif', background: '#f7f9fc', minHeight: '100vh', padding: 24, color: '#10233b' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  card: { background: '#fff', border: '1px solid #d8e1ee', borderRadius: 16, padding: 20, boxShadow: '0 10px 30px rgba(16,35,59,0.06)' },
  label: { color: '#607286', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  value: { fontSize: 24, fontWeight: 800, marginTop: 8 },
  table: { width: '100%', borderCollapse: 'collapse' },
  td: { padding: '10px 8px', borderBottom: '1px solid #edf2f7', fontSize: 14, verticalAlign: 'top' },
  badge: { borderRadius: 999, padding: '4px 10px', display: 'inline-block', fontSize: 12, fontWeight: 700, background: '#edf2f7' },
  toolbar: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' },
  input: { border: '1px solid #d8e1ee', borderRadius: 12, padding: '10px 12px', minWidth: 280, background: '#fff' },
  button: { background: '#0d6efd', color: '#fff', border: 0, borderRadius: 12, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' },
  select: { border: '1px solid #d8e1ee', borderRadius: 12, padding: '10px 12px', background: '#fff' },
};

const configuredApiBaseUrl = ((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE_URL || '').trim();

function getApiBaseUrl() {
  if (!configuredApiBaseUrl || /example\.invalid|your-domain\.com|localhost|127\.0\.0\.1/i.test(configuredApiBaseUrl)) {
    throw new Error('Admin web API base URL is not configured. Set VITE_API_BASE_URL to your live backend API before creating a production build.');
  }
  return configuredApiBaseUrl.replace(/\/$/, '');
}

const API_BASE_URL = getApiBaseUrl();

function MetricCard({ label, value }: { label: string; value: number }) {
  return <div style={styles.card}><div style={styles.label}>{label}</div><div style={styles.value}>{value}</div></div>;
}

export default function App() {
  const [token, setToken] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settlementStatus, setSettlementStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = window.localStorage.getItem('admin_api_token') || '';
    setToken(saved);
  }, []);

  const metrics = useMemo(() => ({
    users: overview?.users.length || 0,
    liveTrips: overview?.trips.filter((item) => ['ASSIGNED', 'AT_PICKUP', 'IN_TRANSIT'].includes(item.currentStatus)).length || 0,
    fraudAlerts: overview?.fraudSignals.filter((item) => item.severity === 'HIGH').length || 0,
    pendingSettlements: overview?.settlements.filter((item) => item.status === 'REQUESTED').length || 0,
    capturedPayments: overview?.payments.filter((item) => item.status === 'CAPTURED').length || 0,
  }), [overview]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError('');
      window.localStorage.setItem('admin_api_token', token);
      const response = await fetch(`${API_BASE_URL}/dashboard/admin/overview`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Unable to load dashboard');
      setOverview(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const updateSettlement = async (id: string) => {
    try {
      const status = settlementStatus[id] || 'APPROVED';
      const response = await fetch(`${API_BASE_URL}/settlements/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Unable to update settlement');
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  return (
    <main style={styles.page}>
      <h1 style={{ marginTop: 0, marginBottom: 8 }}>AP Trucking Admin Dashboard</h1>
      <p style={{ marginTop: 0, color: '#607286' }}>Users, trips, settlements, payments, and fraud signals in one operational console.</p>

      <div style={styles.toolbar}>
        <input style={styles.input} value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste admin bearer token" />
        <button style={styles.button} onClick={loadOverview} disabled={loading || !token}>{loading ? 'Loading...' : 'Load dashboard'}</button>
        {error ? <span style={{ color: '#c62828', fontWeight: 600 }}>{error}</span> : null}
      </div>

      <section style={styles.grid}>
        <MetricCard label="Users" value={metrics.users} />
        <MetricCard label="Live trips" value={metrics.liveTrips} />
        <MetricCard label="Fraud alerts" value={metrics.fraudAlerts} />
        <MetricCard label="Pending settlements" value={metrics.pendingSettlements} />
        <MetricCard label="Captured payments" value={metrics.capturedPayments} />
      </section>

      <section style={{ ...styles.grid, marginTop: 24 }}>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Recent users</h3>
          <table style={styles.table}><tbody>{(overview?.users || []).map((user) => (
            <tr key={user.id}><td style={styles.td}><strong>{user.name}</strong><br />{user.mobile}</td><td style={styles.td}>{user.role}</td><td style={styles.td}>{user.status}</td></tr>
          ))}</tbody></table>
        </div>

        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Fraud review queue</h3>
          <table style={styles.table}><tbody>{(overview?.fraudSignals || []).map((item) => (
            <tr key={item.id}><td style={styles.td}><strong>{item.signalType}</strong><br />{item.reason}</td><td style={styles.td}><span style={styles.badge}>{item.severity}</span></td><td style={styles.td}>Score {item.score}</td></tr>
          ))}</tbody></table>
        </div>

        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Trips</h3>
          <table style={styles.table}><tbody>{(overview?.trips || []).map((item) => (
            <tr key={item.id}><td style={styles.td}><strong>{item.vehicleNumber}</strong><br />{item.load?.pickupCity} → {item.load?.dropCity}</td><td style={styles.td}>{item.driver?.name || '-'}</td><td style={styles.td}>{item.currentStatus}</td></tr>
          ))}</tbody></table>
        </div>

        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Settlements control</h3>
          <table style={styles.table}><tbody>{(overview?.settlements || []).map((item) => (
            <tr key={item.id}>
              <td style={styles.td}><strong>{item.id.slice(-8)}</strong><br />₹{(item.amountInPaise / 100).toFixed(2)}</td>
              <td style={styles.td}>{item.status}</td>
              <td style={styles.td}>
                <select style={styles.select} value={settlementStatus[item.id] || item.status} onChange={(e) => setSettlementStatus((prev) => ({ ...prev, [item.id]: e.target.value }))}>
                  <option value="APPROVED">APPROVED</option>
                  <option value="PAID">PAID</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </td>
              <td style={styles.td}><button style={styles.button} onClick={() => updateSettlement(item.id)}>Update</button></td>
            </tr>
          ))}</tbody></table>
        </div>
      </section>
    </main>
  );
}
