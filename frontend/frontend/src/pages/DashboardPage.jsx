import { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats]   = useState(null);
  const [loads, setLoads]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, lRes] = await Promise.all([
          api.get('/admin/stats').catch(()=>({ data:{ totalUsers:0, totalLoads:0, totalRevenue:0, pendingKYC:0 }})),
          api.get('/freight/my').catch(()=>({ data:[] })),
        ]);
        setStats(sRes.data);
        setLoads(Array.isArray(lRes.data) ? lRes.data.slice(0,5) : []);
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const roleColor = { admin:'#ff6b6b', shipper:'#00c896', transporter:'#1660F5', broker:'#f5a623' }[user?.role] || '#888';
  const CARDS = user?.role === 'transporter'
    ? [['🔍','Find Loads','/marketplace'],['🚛','My Trucks','#'],['📊','Bookings','#'],['💰','Earnings','#']]
    : [['📦','Post Load','/marketplace'],['📋','My Loads','#'],['📍','Track','#'],['💬','Messages','#']];

  return (
    <Layout>
      {/* Welcome */}
      <div style={s.welcomeBox}>
        <h1 style={s.welcome}>Welcome, {user?.name?.split(' ')[0]}! 👋</h1>
        <span style={{...s.roleBadge, background:roleColor+'25', color:roleColor}}>{user?.role?.toUpperCase()}</span>
      </div>

      {/* Stats */}
      <div style={s.statsGrid}>
        {[
          ['📦', user?.role==='transporter'?'Loads Taken':'Loads Posted', stats?.totalLoads ?? '—'],
          ['✅', 'Completed', '0'],
          ['⭐', 'Rating', '5.0'],
          ['💰', user?.role==='transporter'?'Earned':'Spent', '₹0'],
        ].map(([ic,lb,vl])=>(
          <div key={lb} style={s.statCard}>
            <span style={{fontSize:28}}>{ic}</span>
            <span style={s.statVal}>{vl}</span>
            <span style={s.statLbl}>{lb}</span>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 style={s.secTitle}>Quick Actions</h2>
      <div style={s.actionGrid}>
        {CARDS.map(([ic,lb,href])=>(
          <a key={lb} href={href} style={s.actionCard}>
            <span style={{fontSize:32}}>{ic}</span>
            <span style={s.actionLbl}>{lb}</span>
            <span style={{color:'#1660F5',marginTop:'auto'}}>→</span>
          </a>
        ))}
      </div>

      {/* Recent loads */}
      <h2 style={s.secTitle}>Recent Activity</h2>
      <div style={s.table}>
        {loading ? <p style={{color:'#888',padding:20}}>Loading…</p>
        : loads.length === 0 ? (
          <div style={s.empty}>
            <span style={{fontSize:40}}>📭</span>
            <p style={{color:'#888',marginTop:8}}>No activity yet. <a href="/marketplace" style={{color:'#1660F5'}}>Post your first load →</a></p>
          </div>
        ) : loads.map(l=>(
          <div key={l._id} style={s.row}>
            <span style={{color:'#fff',fontWeight:600}}>{l.from} → {l.to}</span>
            <span style={{color:'#888',fontSize:13}}>{l.weight}kg · {l.truckType}</span>
            <span style={{...s.statusBadge, background: l.status==='active'?'#00c89620':'#f5a62320', color:l.status==='active'?'#00c896':'#f5a623'}}>{l.status}</span>
          </div>
        ))}
      </div>
    </Layout>
  );
}

const s = {
  welcomeBox:  { display:'flex', alignItems:'center', gap:14, marginBottom:28 },
  welcome:     { color:'#fff', fontSize:24, fontWeight:700 },
  roleBadge:   { borderRadius:20, padding:'4px 14px', fontSize:12, fontWeight:700 },
  statsGrid:   { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:32 },
  statCard:    { background:'#0B1A35', borderRadius:14, padding:20, display:'flex', flexDirection:'column', alignItems:'center', gap:6, border:'1px solid #1a3060' },
  statVal:     { color:'#fff', fontSize:24, fontWeight:800 },
  statLbl:     { color:'#888', fontSize:12 },
  secTitle:    { color:'#fff', fontSize:16, fontWeight:700, marginBottom:14 },
  actionGrid:  { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:32 },
  actionCard:  { background:'#0B1A35', borderRadius:14, padding:20, display:'flex', flexDirection:'column', gap:8, border:'1px solid #1a3060', cursor:'pointer', textDecoration:'none' },
  actionLbl:   { color:'#fff', fontWeight:600, fontSize:14 },
  table:       { background:'#0B1A35', borderRadius:14, border:'1px solid #1a3060', overflow:'hidden' },
  row:         { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid #1a3060' },
  statusBadge: { borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600 },
  empty:       { display:'flex', flexDirection:'column', alignItems:'center', padding:40 },
};
