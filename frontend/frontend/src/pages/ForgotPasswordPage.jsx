import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await forgotPassword(email); setSent(true); }
    catch (e) { setError(e.response?.data?.message || 'Failed to send reset email'); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>🔐</div>
        <h1 style={s.title}>Forgot Password</h1>
        <p style={s.sub}>We'll send a reset link to your email</p>
        {sent ? (
          <div style={s.success}>
            ✅ Reset link sent! Check your inbox.<br />
            <Link to="/login" style={{color:'#1660F5',display:'block',marginTop:16,textAlign:'center'}}>← Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={submit} style={s.form}>
            {error && <div style={s.err}>⚠️ {error}</div>}
            <label style={s.lbl}>Email Address</label>
            <input style={s.inp} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
            <button style={{...s.btn,opacity:loading?.7:1}} disabled={loading}>{loading?'Sending…':'Send Reset Link'}</button>
            <Link to="/login" style={{color:'#888',fontSize:13,textAlign:'center',marginTop:16,display:'block'}}>← Back to Login</Link>
          </form>
        )}
      </div>
    </div>
  );
}

const s = {
  page:    { minHeight:'100vh', background:'#050D1F', display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  card:    { background:'#0B1A35', borderRadius:20, padding:'40px 32px', width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,.5)' },
  logo:    { fontSize:48, textAlign:'center' },
  title:   { color:'#fff', fontSize:24, fontWeight:700, textAlign:'center', margin:'10px 0 4px' },
  sub:     { color:'#888', fontSize:13, textAlign:'center', marginBottom:24 },
  success: { background:'#00c89620', border:'1px solid #00c896', borderRadius:12, padding:20, color:'#00c896', fontSize:14, textAlign:'center' },
  err:     { background:'#ff3b3020', border:'1px solid #ff3b30', borderRadius:10, padding:12, color:'#ff6b6b', fontSize:13, marginBottom:12 },
  form:    { display:'flex', flexDirection:'column' },
  lbl:     { color:'#aaa', fontSize:12, marginBottom:5, marginTop:10 },
  inp:     { background:'#112040', border:'1px solid #1a3060', borderRadius:10, padding:14, color:'#fff', fontSize:14, marginBottom:4 },
  btn:     { background:'#1660F5', color:'#fff', border:'none', borderRadius:12, padding:15, fontSize:15, fontWeight:700, marginTop:16 },
};
