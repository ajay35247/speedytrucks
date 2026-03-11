import { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const STATUS_COLOR = { active:'#00c896', pending:'#f5a623', completed:'#1660F5', cancelled:'#ff6b6b' };
const TRUCK_TYPES = ['All','Open Body','Closed Container','Flatbed','Refrigerated','Tanker','Tipper'];

export default function MarketplacePage() {
  const { user } = useAuth();
  const [loads, setLoads]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('All');
  const [showPost, setShowPost] = useState(false);
  const [form, setForm]       = useState({ from:'', to:'', weight:'', truckType:'Open Body', description:'', budget:'' });
  const [posting, setPosting] = useState(false);
  const [msg, setMsg]         = useState('');

  const fetchLoads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/freight');
      setLoads(Array.isArray(res.data) ? res.data : res.data?.loads || []);
    } catch { setLoads([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLoads(); }, []);

  const filteredLoads = filter === 'All' ? loads : loads.filter(l => l.truckType === filter);

  const postLoad = async (e) => {
    e.preventDefault();
    setPosting(true); setMsg('');
    try {
      await api.post('/freight', form);
      setMsg('✅ Load posted!'); setShowPost(false); setForm({ from:'',to:'',weight:'',truckType:'Open Body',description:'',budget:'' });
      fetchLoads();
    } catch (e) { setMsg('❌ ' + (e.response?.data?.message || 'Failed to post')); }
    finally { setPosting(false); }
  };

  const placeBid = async (loadId) => {
    const amount = prompt('Enter your bid amount (₹):');
    if (!amount) return;
    try {
      await api.post('/bids', { loadId, amount: Number(amount) });
      alert('✅ Bid placed!');
    } catch (e) { alert('❌ ' + (e.response?.data?.message || 'Failed to place bid')); }
  };

  return (
    <Layout>
      <div style={s.top}>
        <div>
          <h1 style={s.title}>Freight Marketplace</h1>
          <p style={s.sub}>{loads.length} loads available</p>
        </div>
        {(user?.role === 'shipper' || user?.role === 'broker') && (
          <button style={s.postBtn} onClick={() => setShowPost(true)}>+ Post Load</button>
        )}
      </div>

      {msg && <div style={{...s.msg, background: msg.startsWith('✅')?'#00c89620':'#ff3b3020', borderColor: msg.startsWith('✅')?'#00c896':'#ff6b6b', color: msg.startsWith('✅')?'#00c896':'#ff6b6b'}}>{msg}</div>}

      {/* Filters */}
      <div style={s.filters}>
        {TRUCK_TYPES.map(t=>(
          <button key={t} style={{...s.filterBtn,...(filter===t?s.filterOn:{})}} onClick={()=>setFilter(t)}>{t}</button>
        ))}
      </div>

      {/* Post Load Modal */}
      {showPost && (
        <div style={s.modal}>
          <div style={s.modalCard}>
            <div style={s.modalHead}>
              <h2 style={{color:'#fff',fontSize:20,fontWeight:700}}>Post a Load</h2>
              <button style={s.closeBtn} onClick={()=>setShowPost(false)}>✕</button>
            </div>
            <form onSubmit={postLoad} style={s.form}>
              {[['from','Pickup City','e.g. Mumbai'],['to','Destination City','e.g. Delhi'],['weight','Weight (kg)','e.g. 5000'],['budget','Budget (₹)','e.g. 15000']].map(([k,lbl,ph])=>(
                <div key={k}>
                  <label style={s.lbl}>{lbl} *</label>
                  <input style={s.inp} placeholder={ph} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} required={['from','to','weight'].includes(k)} />
                </div>
              ))}
              <div>
                <label style={s.lbl}>Truck Type</label>
                <select style={s.inp} value={form.truckType} onChange={e=>setForm(f=>({...f,truckType:e.target.value}))}>
                  {TRUCK_TYPES.filter(t=>t!=='All').map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={s.lbl}>Description</label>
                <textarea style={{...s.inp,height:80,resize:'vertical'}} placeholder="Describe your load..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
              </div>
              <button style={{...s.postBtn,width:'100%',opacity:posting?.7:1}} disabled={posting}>{posting?'Posting…':'Post Load'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Loads grid */}
      {loading ? (
        <div style={s.empty}><span style={{fontSize:40}}>⏳</span><p style={{color:'#888',marginTop:8}}>Loading loads…</p></div>
      ) : filteredLoads.length === 0 ? (
        <div style={s.empty}><span style={{fontSize:40}}>📭</span><p style={{color:'#888',marginTop:8}}>No loads found</p></div>
      ) : (
        <div style={s.grid}>
          {filteredLoads.map(l=>(
            <div key={l._id} style={s.card}>
              <div style={s.cardHead}>
                <span style={{color:'#fff',fontWeight:700,fontSize:15}}>📍 {l.from} → {l.to}</span>
                <span style={{...s.badge, background:(STATUS_COLOR[l.status]||'#888')+'25', color:STATUS_COLOR[l.status]||'#888'}}>{l.status}</span>
              </div>
              <div style={s.cardMeta}>
                <span>🚛 {l.truckType}</span>
                <span>⚖️ {l.weight} kg</span>
                {l.budget && <span>💰 ₹{l.budget}</span>}
              </div>
              {l.description && <p style={{color:'#888',fontSize:13,marginTop:8}}>{l.description}</p>}
              <div style={s.cardFoot}>
                <span style={{color:'#888',fontSize:12}}>Posted by {l.postedBy?.name || 'Unknown'}</span>
                {user?.role === 'transporter' && l.status === 'active' && (
                  <button style={s.bidBtn} onClick={()=>placeBid(l._id)}>Place Bid</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

const s = {
  top:       { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 },
  title:     { color:'#fff', fontSize:22, fontWeight:700 },
  sub:       { color:'#888', fontSize:13, marginTop:4 },
  postBtn:   { background:'#1660F5', color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:600, fontSize:14 },
  msg:       { border:'1px solid', borderRadius:10, padding:12, fontSize:13, marginBottom:16 },
  filters:   { display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 },
  filterBtn: { background:'transparent', border:'1px solid #1a3060', color:'#888', borderRadius:20, padding:'7px 14px', fontSize:13, fontWeight:500 },
  filterOn:  { borderColor:'#1660F5', background:'#1660F520', color:'#fff' },
  grid:      { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 },
  card:      { background:'#0B1A35', borderRadius:14, padding:20, border:'1px solid #1a3060', display:'flex', flexDirection:'column', gap:10 },
  cardHead:  { display:'flex', justifyContent:'space-between', alignItems:'center' },
  badge:     { borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600 },
  cardMeta:  { display:'flex', gap:14, color:'#888', fontSize:13 },
  cardFoot:  { display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 },
  bidBtn:    { background:'#1660F5', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', fontSize:13, fontWeight:600 },
  empty:     { display:'flex', flexDirection:'column', alignItems:'center', padding:60 },
  modal:     { position:'fixed', inset:0, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  modalCard: { background:'#0B1A35', borderRadius:20, padding:28, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' },
  modalHead: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  closeBtn:  { background:'transparent', border:'1px solid #1a3060', color:'#888', borderRadius:8, padding:'6px 10px', fontSize:16 },
  form:      { display:'flex', flexDirection:'column', gap:12 },
  lbl:       { color:'#aaa', fontSize:12, marginBottom:4, display:'block' },
  inp:       { background:'#112040', border:'1px solid #1a3060', borderRadius:10, padding:12, color:'#fff', fontSize:14, width:'100%' },
};
