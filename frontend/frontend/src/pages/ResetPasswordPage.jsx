import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const [pass, setPass]     = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const token = params.get('token');

  const submit = async (e) => {
    e.preventDefault();
    if (pass !== confirm) { setError('Passwords do not match'); return; }
    if (pass.length < 6)  { setError('Password must be at least 6 characters'); return; }
    setError(''); setLoading(true);
    try { await resetPassword(token, pass); navigate('/login?reset=1'); }
    catch (e) { setError(e.response?.data?.message || 'Reset failed. Link may have expired.'); }
    finally { setLoading(false); }
  };

  if (!token) return (
    <div style={s.page}><div style={s.card}>
      <div style={s.err}>❌ Invalid or missing reset token.<br /><Link to="/forgot-password" style={{color:'#1660F5'}}>Request a new link</Link></div>
    </div></div>
  );

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>🔑</div>
        <h1 style={s.title}>Reset Password</h1>
        <p style={s.sub}>Enter your new password below</p>
        <form onSubmit={submit} style={s.form}>
          {error && <div style={s.err}>⚠️ {error}</div>}
          <label style={s.lbl}>New Password</label>
          <input style={s.inp} type="password" placeholder="Min 6 characters" value={pass} onChange={e=>setPass(e.target.value)} required />
          <label style={s.lbl}>Confirm Password</label>
          <input style={s.inp} type="password" placeholder="Repeat password" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
          <button style={{...s.btn,opacity:loading?.7:1}} disabled={loading}>{loading?'Resetting…':'Reset Password'}</button>
        </form>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh', background:'#050D1F', display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  card: { background:'#0B1A35', borderRadius:20, padding:'40px 32px', width:'100%', maxWidth:400 },
  logo: { fontSize:48, textAlign:'center' },
  title:{ color:'#fff', fontSize:24, fontWeight:700, textAlign:'center', margin:'10px 0 4px' },
  sub:  { color:'#888', fontSize:13, textAlign:'center', marginBottom:24 },
  err:  { background:'#ff3b3020', border:'1px solid #ff3b30', borderRadius:10, padding:12, color:'#ff6b6b', fontSize:13, marginBottom:12 },
  form: { display:'flex', flexDirection:'column' },
  lbl:  { color:'#aaa', fontSize:12, marginBottom:5, marginTop:10 },
  inp:  { background:'#112040', border:'1px solid #1a3060', borderRadius:10, padding:14, color:'#fff', fontSize:14, marginBottom:4 },
  btn:  { background:'#1660F5', color:'#fff', border:'none', borderRadius:12, padding:15, fontSize:15, fontWeight:700, marginTop:16 },
};
