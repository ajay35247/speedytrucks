import { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import api from '../services/api';

const TABS = ['Stats','Users','KYC','Audit Logs'];

export default function AdminPage() {
  const [tab, setTab]         = useState('Stats');
  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [kycs, setKycs]       = useState([]);
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState('');

  useEffect(() => { fetchTab(tab); }, [tab]);

  const fetchTab = async (t) => {
    setLoading(true); setMsg('');
    try {
      if (t === 'Stats')      { const r = await api.get('/admin/stats');       setStats(r.data); }
      if (t === 'Users')      { const r = await api.get('/admin/users');       setUsers(Array.isArray(r.data)?r.data:r.data?.users||[]); }
      if (t === 'KYC')        { const r = await api.get('/admin/kyc/pending'); setKycs(Array.isArray(r.data)?r.data:r.data?.kycs||[]); }
      if (t === 'Audit Logs') { const r = await api.get('/admin/audit-logs'); setLogs(Array.isArray(r.data)?r.data:r.data?.logs||[]); }
    } catch (e) { setMsg('❌ ' + (e.response?.data?.message || 'Failed to load')); }
    finally { setLoading(false); }
  };

  const suspend = async (id) => {
    if (!confirm('Suspend this user?')) return;
    try { await api.patch(`/admin/users/${id}/suspend`); fetchTab('Users'); } catch (e) { setMsg('❌ '+e.response?.data?.message); }
  };
  const reinstate = async (id) => {
    try { await api.patch(`/admin/users/${id}/reinstate`); fetchTab('Users'); } catch (e) { setMsg('❌ '+e.response?.data?.message); }
  };
  const approveKYC = async (id) => {
    try { await api.patch(`/admin/kyc/${id}/approve`); fetchTab('KYC'); setMsg('✅ KYC approved!'); } catch (e) { setMsg('❌ '+e.response?.data?.message); }
  };

  const ROLE_COLOR = { admin:'#ff6b6b', shipper:'#00c896', transporter:'#1660F5', broker:'#f5a623' };

  return (
    <Layout>
      <h1 style={s.title}>Admin Panel</h1>

      {/* Tabs */}
      <div style={s.tabs}>{TABS.map(t=>(
        <button key={t} style={{...s.tab,...(tab===t?s.tabOn:{})}} onClick={()=>setTab(t)}>{t}</button>
      ))}</div>

      {msg && <div style={{...s.alert, background:msg.startsWith('✅')?'#00c89620':'#ff3b3020', borderColor:msg.startsWith('✅')?'#00c896':'#ff6b6b', color:msg.startsWith('✅')?'#00c896':'#ff6b6b'}}>{msg}</div>}

      {loading ? <p style={{color:'#888',padding:20}}>Loading…</p> : <>

        {/* Stats */}
        {tab==='Stats' && stats && (
          <div style={s.statsGrid}>
            {[['👥','Total Users',stats.totalUsers],['📦','Total Loads',stats.totalLoads],['💰','Revenue',`₹${stats.totalRevenue||0}`],['⏳','Pending KYC',stats.pendingKYC]].map(([ic,lb,vl])=>(
              <div key={lb} style={s.statCard}>
                <span style={{fontSize:32}}>{ic}</span>
                <span style={{color:'#fff',fontSize:28,fontWeight:800}}>{vl}</span>
                <span style={{color:'#888',fontSize:13}}>{lb}</span>
              </div>
            ))}
          </div>
        )}

        {/* Users */}
        {tab==='Users' && (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr style={s.thead}>
                {['Name','Email','Role','Status','Actions'].map(h=><th key={h} style={s.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u._id} style={s.tr}>
                    <td style={s.td}><span style={{color:'#fff',fontWeight:600}}>{u.name}</span></td>
                    <td style={s.td}><span style={{color:'#888',fontSize:13}}>{u.email}</span></td>
                    <td style={s.td}><span style={{background:(ROLE_COLOR[u.role]||'#888')+'25',color:ROLE_COLOR[u.role]||'#888',borderRadius:20,padding:'2px 10px',fontSize:12,fontWeight:600}}>{u.role}</span></td>
                    <td style={s.td}><span style={{color:u.status==='active'?'#00c896':'#ff6b6b',fontSize:13}}>{u.status}</span></td>
                    <td style={s.td}>
                      {u.status==='active'
                        ? <button style={{...s.actionBtn,borderColor:'#ff6b6b40',color:'#ff6b6b'}} onClick={()=>suspend(u._id)}>Suspend</button>
                        : <button style={{...s.actionBtn,borderColor:'#00c89640',color:'#00c896'}} onClick={()=>reinstate(u._id)}>Reinstate</button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length===0 && <p style={{color:'#888',padding:20,textAlign:'center'}}>No users found</p>}
          </div>
        )}

        {/* KYC */}
        {tab==='KYC' && (
          <div style={s.grid}>
            {kycs.length===0 ? <p style={{color:'#888'}}>No pending KYC requests</p> : kycs.map(k=>(
              <div key={k._id} style={s.card}>
                <div style={{color:'#fff',fontWeight:700}}>{k.user?.name || 'Unknown'}</div>
                <div style={{color:'#888',fontSize:13}}>{k.user?.email}</div>
                <div style={{color:'#f5a623',fontSize:12,marginTop:4}}>{Object.keys(k.documents||{}).length} documents uploaded</div>
                <button style={{...s.approveBtn}} onClick={()=>approveKYC(k._id)}>✅ Approve KYC</button>
              </div>
            ))}
          </div>
        )}

        {/* Audit Logs */}
        {tab==='Audit Logs' && (
          <div style={s.tableWrap}>
            {logs.length===0 ? <p style={{color:'#888',padding:20}}>No audit logs</p> : logs.map(l=>(
              <div key={l._id} style={s.logRow}>
                <span style={{color:'#888',fontSize:12,minWidth:140}}>{new Date(l.createdAt).toLocaleString('en-IN')}</span>
                <span style={{color:'#fff',fontSize:13,flex:1}}>{l.action}</span>
                <span style={{color:'#888',fontSize:12}}>{l.user?.name || 'System'}</span>
              </div>
            ))}
          </div>
        )}
      </>}
    </Layout>
  );
}

const s = {
  title:     { color:'#fff', fontSize:22, fontWeight:700, marginBottom:20 },
  tabs:      { display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' },
  tab:       { padding:'9px 18px', borderRadius:10, border:'1px solid #1a3060', background:'transparent', color:'#888', fontSize:13, fontWeight:600 },
  tabOn:     { borderColor:'#1660F5', background:'#1660F520', color:'#fff' },
  alert:     { border:'1px solid', borderRadius:10, padding:12, fontSize:13, marginBottom:16 },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 },
  statCard:  { background:'#0B1A35', borderRadius:14, padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:8, border:'1px solid #1a3060' },
  tableWrap: { background:'#0B1A35', borderRadius:14, border:'1px solid #1a3060', overflow:'auto' },
  table:     { width:'100%', borderCollapse:'collapse' },
  thead:     { borderBottom:'1px solid #1a3060' },
  th:        { color:'#888', fontSize:12, fontWeight:600, padding:'12px 16px', textAlign:'left' },
  tr:        { borderBottom:'1px solid #1a306060' },
  td:        { padding:'12px 16px' },
  actionBtn: { background:'transparent', border:'1px solid', borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:600 },
  grid:      { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 },
  card:      { background:'#0B1A35', borderRadius:14, padding:20, border:'1px solid #1a3060', display:'flex', flexDirection:'column', gap:8 },
  approveBtn:{ background:'#00c89620', border:'1px solid #00c896', color:'#00c896', borderRadius:10, padding:'9px 0', fontSize:13, fontWeight:600, marginTop:8 },
  logRow:    { display:'flex', gap:16, alignItems:'center', padding:'12px 16px', borderBottom:'1px solid #1a306040' },
};
