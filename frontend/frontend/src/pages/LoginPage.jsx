import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, sendOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]       = useState('email');
  const [email, setEmail]   = useState('');
  const [pass, setPass]     = useState('');
  const [phone, setPhone]   = useState('');
  const [otp, setOtp]       = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const go = async (fn) => {
    setError(''); setLoading(true);
    try { await fn(); navigate('/dashboard'); }
    catch (e) { setError(e.response?.data?.message || e.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>🚛</div>
        <h1 style={s.title}>Welcome Back</h1>
        <p style={s.sub}>India's #1 Freight Marketplace</p>

        <div style={s.tabs}>
          {[['email','📧 Email'],['otp','📱 OTP']].map(([id,lbl])=>(
            <button key={id} style={{...s.tab,...(tab===id?s.tabOn:{})}} onClick={()=>{setTab(id);setError('');}}>
              {lbl}
            </button>
          ))}
        </div>

        {error && <div style={s.err}>⚠️ {error}</div>}

        {tab === 'email' && (
          <div style={s.form}>
            <label style={s.lbl}>Email</label>
            <input style={s.inp} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
            <label style={s.lbl}>Password</label>
            <div style={{display:'flex',gap:8}}>
              <input style={{...s.inp,flex:1,marginBottom:0}} type={showPass?'text':'password'} placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} />
              <button style={s.eye} onClick={()=>setShowPass(p=>!p)}>{showPass?'🙈':'👁️'}</button>
            </div>
            <div style={{textAlign:'right',marginTop:6}}>
              <Link to="/forgot-password" style={{color:'#1660F5',fontSize:12}}>Forgot password?</Link>
            </div>
            <button style={{...s.btn,opacity:loading?.7:1}} disabled={loading} onClick={()=>go(()=>login(email,pass))}>
              {loading?'Signing in…':'Sign In →'}
            </button>
          </div>
        )}

        {tab === 'otp' && (
          <div style={s.form}>
            <label style={s.lbl}>Mobile Number</label>
            <div style={{display:'flex'}}>
              <span style={s.pfx}>+91</span>
              <input style={{...s.inp,borderRadius:'0 10px 10px 0',marginBottom:0,flex:1}} type="tel" placeholder="9876543210" maxLength={10} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,''))} disabled={otpSent} />
            </div>
            {otpSent && (
              <>
                <label style={{...s.lbl,marginTop:14}}>Enter OTP</label>
                <input style={{...s.inp,letterSpacing:10,fontSize:22,textAlign:'center'}} type="tel" placeholder="——————" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} />
                <button style={{background:'none',border:'none',color:'#1660F5',fontSize:12,marginTop:6,textAlign:'left'}} onClick={()=>{setOtpSent(false);setOtp('');}}>← Change number</button>
              </>
            )}
            <button style={{...s.btn,opacity:loading?.7:1}} disabled={loading}
              onClick={()=>{
                if(!otpSent) go(async()=>{await sendOTP(`+91${phone}`);setOtpSent(true);throw {message:'OTP sent! Check your SMS'};});
                else go(()=>verifyOTP(`+91${phone}`,otp));
              }}>
              {loading?'Please wait…':otpSent?'Verify OTP →':'Send OTP →'}
            </button>
          </div>
        )}

        <p style={s.foot}>No account? <Link to="/register" style={{color:'#1660F5',fontWeight:700}}>Register Free</Link></p>
      </div>
    </div>
  );
}

const s = {
  page:  { minHeight:'100vh', background:'#050D1F', display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  card:  { background:'#0B1A35', borderRadius:20, padding:'40px 32px', width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,.5)' },
  logo:  { fontSize:56, textAlign:'center' },
  title: { color:'#fff', fontSize:26, fontWeight:700, textAlign:'center', margin:'10px 0 4px' },
  sub:   { color:'#888', fontSize:13, textAlign:'center', marginBottom:24 },
  tabs:  { display:'flex', gap:8, marginBottom:20 },
  tab:   { flex:1, padding:'10px', borderRadius:10, border:'2px solid #1a3060', background:'transparent', color:'#888', fontSize:13, fontWeight:600 },
  tabOn: { borderColor:'#1660F5', background:'#1660F520', color:'#fff' },
  err:   { background:'#ff3b3020', border:'1px solid #ff3b30', borderRadius:10, padding:12, color:'#ff6b6b', fontSize:13, marginBottom:16 },
  form:  { display:'flex', flexDirection:'column' },
  lbl:   { color:'#aaa', fontSize:12, marginBottom:5, marginTop:12 },
  inp:   { background:'#112040', border:'1px solid #1a3060', borderRadius:10, padding:14, color:'#fff', fontSize:15, marginBottom:4, width:'100%' },
  eye:   { background:'#112040', border:'1px solid #1a3060', borderRadius:10, padding:'13px 14px', fontSize:16 },
  pfx:   { background:'#1a3060', borderRadius:'10px 0 0 10px', padding:'14px 12px', color:'#fff', fontWeight:700, fontSize:14 },
  btn:   { background:'#1660F5', color:'#fff', border:'none', borderRadius:12, padding:16, fontSize:15, fontWeight:700, marginTop:20 },
  foot:  { color:'#888', fontSize:13, textAlign:'center', marginTop:20 },
};
