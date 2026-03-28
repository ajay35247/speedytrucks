import React, { useEffect, useMemo, useRef, useState } from 'react';

type Overview = {
  users: Array<{ id: string; name: string; mobile: string; role: string; status: string }>;
  trips: Array<{ id: string; currentStatus: string; vehicleNumber: string; driver?: { name: string }; load?: { pickupCity: string; dropCity: string } }>;
  loads: Array<{ id: string; pickupCity: string; dropCity: string; materialType: string; status: string; shipper?: { name: string } }>;
  payments: Array<{ id?: string; razorpayOrderId: string; amountInPaise: number; status: string }>;
  settlements: Array<{ id: string; amountInPaise: number; status: string; reference?: string }>;
  fraudSignals: Array<{ id: string; signalType: string; severity: string; score: number; reason: string }>;
};

type AdminIdentity = {
  id: string;
  mobile: string;
  role: 'ADMIN';
  name: string;
};

type SessionState = {
  user: AdminIdentity | null;
  loaded: boolean;
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
  authGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 },
  input: { border: '1px solid #d8e1ee', borderRadius: 12, padding: '10px 12px', minWidth: 200, background: '#fff' },
  button: { background: '#0d6efd', color: '#fff', border: 0, borderRadius: 12, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' },
  ghostButton: { background: '#fff', color: '#0d6efd', border: '1px solid #0d6efd', borderRadius: 12, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' },
  select: { border: '1px solid #d8e1ee', borderRadius: 12, padding: '10px 12px', background: '#fff' },
  muted: { color: '#607286' },
  error: { color: '#c62828', fontWeight: 600 },
  success: { color: '#1b5e20', fontWeight: 600 },
};

const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env || {};
const configuredApiBaseUrl = (env.VITE_API_BASE_URL || '').trim();
const sessionKey = 'admin_session_profile_v4';

function getApiBaseUrl() {
  if (!configuredApiBaseUrl) return '';
  return configuredApiBaseUrl.replace(/\/$/, '');
}

const API_BASE_URL = getApiBaseUrl();

function MetricCard({ label, value }: { label: string; value: number }) {
  return <div style={styles.card}><div style={styles.label}>{label}</div><div style={styles.value}>{value}</div></div>;
}

function readSession(): SessionState {
  try {
    const raw = window.sessionStorage.getItem(sessionKey);
    if (!raw) return { user: null, loaded: true };
    const parsed = JSON.parse(raw) as AdminIdentity;
    if (!parsed?.id) return { user: null, loaded: true };
    return { user: parsed, loaded: true };
  } catch {
    return { user: null, loaded: true };
  }
}

function saveSession(user: AdminIdentity | null) {
  if (!user) {
    window.sessionStorage.removeItem(sessionKey);
    return;
  }
  window.sessionStorage.setItem(sessionKey, JSON.stringify(user));
}

async function apiFetch(path: string, init?: RequestInit, token?: string) {
  if (!API_BASE_URL || /example\.invalid|your-domain\.com|localhost|127\.0\.0\.1/i.test(API_BASE_URL)) {
    throw new Error('VITE_API_BASE_URL is not configured with your live backend API. Update frontend/.env or Vercel environment variables before using the dashboard.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Client': 'web-dashboard',
      'X-Session-Transport': 'cookie-only',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  if (response.status === 204) return {};
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { message?: string }).message || 'Request failed');
  }
  return payload;
}

export default function App() {
  const [{ user, loaded }, setSession] = useState<SessionState>({ user: null, loaded: false });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [settlementStatus, setSettlementStatus] = useState<Record<string, string>>({});
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    setSession(readSession());
  }, []);

  const metrics = useMemo(() => ({
    users: overview?.users.length || 0,
    liveTrips: overview?.trips.filter((item) => ['ASSIGNED', 'AT_PICKUP', 'IN_TRANSIT'].includes(item.currentStatus)).length || 0,
    fraudAlerts: overview?.fraudSignals.length || 0,
    pendingSettlements: overview?.settlements.filter((item) => item.status === 'REQUESTED').length || 0,
    capturedPayments: overview?.payments.filter((item) => item.status === 'CAPTURED').length || 0,
  }), [overview]);

  const refreshSession = async () => {
    setRefreshing(true);
    setError('');
    try {
      const payload = await apiFetch('/auth/refresh-token', { method: 'POST', body: JSON.stringify({}) }) as { token: string };
      accessTokenRef.current = payload.token;
      setMessage('Session rotated securely via HttpOnly refresh cookie.');
      return payload.token;
    } catch (err) {
      accessTokenRef.current = null;
      saveSession(null);
      setSession({ user: null, loaded: true });
      setError(err instanceof Error ? err.message : 'Session refresh failed');
      return null;
    } finally {
      setRefreshing(false);
    }
  };

  const sendOtp = async () => {
    setSendingOtp(true);
    setError('');
    setMessage('');
    try {
      await apiFetch('/auth/send-otp', { method: 'POST', body: JSON.stringify({ mobile }) });
      setMessage('OTP sent successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setVerifyingOtp(true);
    setError('');
    setMessage('');
    try {
      const payload = await apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ mobile, otp, name, role: 'ADMIN' }) }) as { user: AdminIdentity & { token: string } };
      const nextUser = { id: payload.user.id, mobile: payload.user.mobile, role: payload.user.role, name: payload.user.name };
      accessTokenRef.current = payload.user.token;
      saveSession(nextUser);
      setSession({ user: nextUser, loaded: true });
      setMessage('Admin session started for a pre-provisioned admin account. Refresh token remains only in the secure HttpOnly cookie, not in web storage.');
      await loadOverview(payload.user.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const logout = async () => {
    try {
      const authToken = accessTokenRef.current || await refreshSession();
      if (authToken) {
        await apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({}) }, authToken);
      }
    } catch {
      // Best-effort logout.
    } finally {
      accessTokenRef.current = null;
      saveSession(null);
      setSession({ user: null, loaded: true });
      setOverview(null);
      setMessage('Signed out.');
    }
  };

  const loadOverview = async (tokenOverride?: string) => {
    const authToken = tokenOverride || accessTokenRef.current || await refreshSession();
    if (!authToken) return;

    setLoading(true);
    setError('');
    try {
      const payload = await apiFetch('/dashboard/admin/overview', { method: 'GET' }, authToken) as Overview;
      accessTokenRef.current = authToken;
      setOverview(payload);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Failed to load dashboard';
      if (/expired|invalid|session/i.test(messageText)) {
        const rotated = await refreshSession();
        if (rotated && rotated !== authToken) {
          await loadOverview(rotated);
          return;
        }
      }
      setError(messageText);
    } finally {
      setLoading(false);
    }
  };

  const updateSettlement = async (id: string) => {
    try {
      const authToken = accessTokenRef.current || await refreshSession();
      if (!authToken) return;
      const status = settlementStatus[id] || 'APPROVED';
      await apiFetch(`/settlements/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reference: status === 'PAID' ? `admin-${Date.now()}` : undefined }),
      }, authToken);
      setMessage(`Settlement ${id.slice(-6)} updated.`);
      await loadOverview(authToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settlement');
    }
  };

  useEffect(() => {
    if (user && !accessTokenRef.current) {
      refreshSession().then((token) => {
        if (token) {
          loadOverview(token).catch(() => undefined);
        }
      }).catch(() => undefined);
      return;
    }
    if (user && accessTokenRef.current) {
      loadOverview(accessTokenRef.current).catch(() => undefined);
    }
  }, [user?.id]);

  if (!loaded) {
    return <main style={styles.page}>Loading dashboard…</main>;
  }

  return (
    <main style={styles.page}>
      <h1 style={{ marginTop: 0 }}>AP Trucking Operations Console</h1>
      <p style={styles.muted}>Monitor users, trips, settlements, payments, and fraud signals in one operational console.</p>

      {!user ? (
        <section style={styles.authGrid}>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Admin sign in</h3>
            <p style={styles.muted}>Admin OTP login now works only for numbers that already exist as approved admin accounts in the backend. No self-signup or self-promotion path remains.</p>
            <div style={styles.toolbar}>
              <input style={styles.input} value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="Admin mobile (+91...)" />
              <input style={styles.input} value={name} onChange={(event) => setName(event.target.value)} placeholder="Admin name (optional)" />
              <button style={styles.button} onClick={sendOtp} disabled={sendingOtp || !mobile.trim()}>{sendingOtp ? 'Sending OTP...' : 'Send OTP'}</button>
            </div>
            <div style={styles.toolbar}>
              <input style={styles.input} value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="6-digit OTP" />
              <button style={styles.button} onClick={verifyOtp} disabled={verifyingOtp || otp.trim().length !== 6 || !mobile.trim()}>{verifyingOtp ? 'Verifying...' : 'Verify OTP'}</button>
            </div>
            {message ? <div style={styles.success}>{message}</div> : null}
            {error ? <div style={styles.error}>{error}</div> : null}
          </div>

          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Release links</h3>
            <p style={styles.muted}>Publish these pages from the same Vercel deployment for Play Store review and support readiness.</p>
            <ul>
              <li><a href="/privacy-policy.html">Privacy policy</a></li>
              <li><a href="/account-deletion.html">Account deletion</a></li>
            </ul>
          </div>
        </section>
      ) : (
        <div style={styles.toolbar}>
          <span style={{ fontWeight: 700 }}>{user.name}</span>
          <span style={styles.muted}>{user.mobile}</span>
          <span style={styles.badge}>{user.role}</span>
          <button style={styles.button} onClick={() => loadOverview()} disabled={loading}>{loading ? 'Loading...' : 'Refresh dashboard'}</button>
          <button style={styles.ghostButton} onClick={() => refreshSession()} disabled={refreshing}>{refreshing ? 'Refreshing session...' : 'Rotate session'}</button>
          <button style={styles.ghostButton} onClick={logout}>Logout</button>
          {message ? <span style={styles.success}>{message}</span> : null}
          {error ? <span style={styles.error}>{error}</span> : null}
        </div>
      )}

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
          <table style={styles.table}><tbody>{(overview?.users || []).map((entry) => (
            <tr key={entry.id}><td style={styles.td}><strong>{entry.name}</strong><br />{entry.mobile}</td><td style={styles.td}>{entry.role}</td><td style={styles.td}>{entry.status}</td></tr>
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
