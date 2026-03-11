import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { id:'shipper',      icon:'📦', label:'Shipper',     desc:'Post loads & book trucks' },
  { id:'transporter',  icon:'🚛', label:'Truck Owner', desc:'Find loads & earn money' },
  { id:'broker',       icon:'🤝', label:'Broker',      desc:'Match & earn commission' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', role:'shipper', company:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setLoading(true);
    try {
      await register({ ...form, phone: form.phone ? `+91${form.phone}` : '' });
      navigate('/dashboard');
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>🚛</div>
        <h1 style={s.title}>Create Account</h1>
        <p style={s.sub}>Join India's #1 Freight Platform</p>

        {/* Role picker */}
        <div style={s.roles}>
          {ROLES.map(r=>(
            <button key={r.id} type="button" style={{...s.roleBtn,...(form.role===r.id?s.roleOn:{})}} onClick={()=>set('role',r.id)}>
              <span style={{fontSize:24}}>{r.icon}</span>
              <span style={{color:'#fff',fontWeight:700,fontSize:12}}>{r.label}</span>
              <span style={{color:'#888',fontSize:10,textAlign:'center'}}>{r.desc}</span>
            </button>
          ))}
        </div>

        {error && <div style={s.err}>⚠️ {error}</div>}

        <form onSubmit={submit} style={s.form}>
          <label style={s.lbl}>Full Name *</label>
          <input style={s.inp} placeholder="Ajay Kumar" value={form.name} onChange={e=>set('name',e.target.value)} required />
          <label style={s.lbl}>Email *</label>
          <input style={s.inp} type="email" placeholder="ajay@example.com" value={form.email} onChange={e=>set('email',e.target.value)} required />
          <label style={s.lbl}>Mobile Number</label>
          <div style={{display:'flex'}}>
            <span style={s.pfx}>+91</span>
            <input style={{...s.inp,borderRadius:'0 10px 10px 0',flex:1,marginBottom:0}} type="tel" placeholder="9876543210" maxLength={10} value={form.phone} onChange={e=>set('phone',e.target.value.replace(/\D/g,''))} />
          </div>
          <label style={{...s.lbl,marginTop:12}}>Company Name</label>
          <input style={s.inp} placeholder="Optional" value={form.company} onChange={e=>set('company',e.target.value)} />
          <label style={s.lbl}>Password *</label>
          <input style={s.inp} type="password" placeholder="Min 6 characters" value={form.password} onChange={e=>set('password',e.target.value)} required />
          <button style={{...s.btn,opacity:loading?.7:1}} type="submit" disabled={loading}>
            {loading?'Creating…':'Create Account →'}
          </button>
        </form>

        <p style={s.foot}>Already have an account? <Link to="/login" style={{color:'#1660F5',fontWeight:700}}>Sign In</Link></p>
      </div>
    </div>
  );
}

const s = {
  page:    { minHeight:'100vh', background:'#050D1F', display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  card:    { background:'#0B1A35', borderRadius:20, padding:'40px 32px', width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,.5)' },
  logo:    { fontSize:48, textAlign:'center' },
  title:   { color:'#fff', fontSize:24, fontWeight:700, textAlign:'center', margin:'10px 0 4px' },
  sub:     { color:'#888', fontSize:13, textAlign:'center', marginBottom:20 },
  roles:   { display:'flex', gap:8, marginBottom:16 },
  roleBtn: { flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'12px 8px', borderRadius:12, border:'2px solid #1a3060', background:'transparent', cursor:'pointer' },
  roleOn:  { borderColor:'#1660F5', background:'#1660F520' },
  err:     { background:'#ff3b3020', border:'1px solid #ff3b30', borderRadius:10, padding:12, color:'#ff6b6b', fontSize:13, marginBottom:12 },
  form:    { display:'flex', flexDirection:'column' },
  lbl:     { color:'#aaa', fontSize:12, marginBottom:5, marginTop:10 },
  inp:     { background:'#112040', border:'1px solid #1a3060', borderRadius:10, padding:13, color:'#fff', fontSize:14, marginBottom:4, width:'100%' },
  pfx:     { background:'#1a3060', borderRadius:'10px 0 0 10px', padding:'13px 12px', color:'#fff', fontWeight:700, fontSize:13 },
  btn:     { background:'#1660F5', color:'#fff', border:'none', borderRadius:12, padding:15, fontSize:15, fontWeight:700, marginTop:18 },
  foot:    { color:'#888', fontSize:13, textAlign:'center', marginTop:18 },
};
