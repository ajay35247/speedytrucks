import { useState, useEffect } from 'react';
import Layout from '../components/shared/Layout';
import api from '../services/api';

const DOCS = [
  { id:'aadhaar',  label:'Aadhaar Card',   icon:'🪪', required:true },
  { id:'pan',      label:'PAN Card',        icon:'💳', required:true },
  { id:'license',  label:'Driving License', icon:'🚗', required:false },
  { id:'rc',       label:'RC Book',         icon:'📄', required:false },
];

export default function KYCPage() {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [msg, setMsg]         = useState('');

  useEffect(() => {
    api.get('/kyc/status')
      .then(r => setStatus(r.data))
      .catch(() => setStatus({ status:'not_started', documents:{} }))
      .finally(() => setLoading(false));
  }, []);

  const upload = async (docType, file) => {
    setUploading(u=>({...u,[docType]:true})); setMsg('');
    try {
      const fd = new FormData();
      fd.append('document', file);
      await api.post(`/kyc/upload/${docType}`, fd, { headers:{ 'Content-Type':'multipart/form-data' }});
      setMsg('✅ Document uploaded!');
      const r = await api.get('/kyc/status');
      setStatus(r.data);
    } catch (e) { setMsg('❌ ' + (e.response?.data?.message || 'Upload failed')); }
    finally { setUploading(u=>({...u,[docType]:false})); }
  };

  const overallStatus = status?.status || 'not_started';
  const statusColor   = { approved:'#00c896', pending:'#f5a623', rejected:'#ff6b6b', not_started:'#888' }[overallStatus];

  return (
    <Layout>
      <h1 style={s.title}>KYC Verification</h1>
      <p style={s.sub}>Complete KYC to unlock all platform features</p>

      {/* Status Banner */}
      <div style={{...s.banner, background:statusColor+'20', borderColor:statusColor}}>
        <span style={{fontSize:24}}>{overallStatus==='approved'?'✅':overallStatus==='pending'?'⏳':overallStatus==='rejected'?'❌':'📋'}</span>
        <div>
          <div style={{color:'#fff',fontWeight:700,fontSize:15}}>
            KYC Status: <span style={{color:statusColor}}>{overallStatus.toUpperCase().replace('_',' ')}</span>
          </div>
          <div style={{color:'#888',fontSize:13,marginTop:4}}>
            {overallStatus==='approved' ? 'Your account is fully verified!' :
             overallStatus==='pending'  ? 'Documents are being reviewed (1-2 business days)' :
             overallStatus==='rejected' ? 'Some documents were rejected. Please re-upload.' :
             'Upload your documents to get verified'}
          </div>
        </div>
      </div>

      {msg && <div style={{...s.alert, background:msg.startsWith('✅')?'#00c89620':'#ff3b3020', borderColor:msg.startsWith('✅')?'#00c896':'#ff6b6b', color:msg.startsWith('✅')?'#00c896':'#ff6b6b'}}>{msg}</div>}

      {/* Document cards */}
      {loading ? <p style={{color:'#888',padding:20}}>Loading…</p> : (
        <div style={s.grid}>
          {DOCS.map(doc => {
            const uploaded = status?.documents?.[doc.id];
            const docStatus = uploaded?.status || 'not_uploaded';
            const docColor  = { approved:'#00c896', pending:'#f5a623', rejected:'#ff6b6b', not_uploaded:'#888' }[docStatus];
            return (
              <div key={doc.id} style={s.card}>
                <div style={s.cardHead}>
                  <span style={{fontSize:36}}>{doc.icon}</span>
                  <span style={{...s.badge, background:docColor+'20', color:docColor}}>
                    {docStatus.toUpperCase().replace('_',' ')}
                  </span>
                </div>
                <h3 style={s.docTitle}>{doc.label}</h3>
                {doc.required && <span style={s.required}>Required</span>}
                {uploaded?.url && <a href={uploaded.url} target="_blank" rel="noreferrer" style={s.viewLink}>View uploaded doc ↗</a>}
                {docStatus !== 'approved' && (
                  <label style={s.uploadBtn}>
                    {uploading[doc.id] ? 'Uploading…' : docStatus === 'not_uploaded' ? '+ Upload' : '🔄 Re-upload'}
                    <input type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>e.target.files[0]&&upload(doc.id,e.target.files[0])} disabled={uploading[doc.id]} />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={s.note}>
        <strong>📌 Accepted formats:</strong> JPG, PNG, PDF · Max size: 5MB per document · Documents are stored securely on Cloudinary
      </div>
    </Layout>
  );
}

const s = {
  title:     { color:'#fff', fontSize:22, fontWeight:700, marginBottom:6 },
  sub:       { color:'#888', fontSize:14, marginBottom:24 },
  banner:    { display:'flex', alignItems:'center', gap:16, border:'1px solid', borderRadius:14, padding:'16px 20px', marginBottom:20 },
  alert:     { border:'1px solid', borderRadius:10, padding:12, fontSize:13, marginBottom:16 },
  grid:      { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16, marginBottom:24 },
  card:      { background:'#0B1A35', borderRadius:14, padding:20, border:'1px solid #1a3060', display:'flex', flexDirection:'column', gap:10 },
  cardHead:  { display:'flex', justifyContent:'space-between', alignItems:'center' },
  badge:     { borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 },
  docTitle:  { color:'#fff', fontWeight:700, fontSize:15 },
  required:  { color:'#f5a623', fontSize:12, fontWeight:600 },
  viewLink:  { color:'#1660F5', fontSize:13 },
  uploadBtn: { background:'#1660F5', color:'#fff', borderRadius:10, padding:'10px 0', fontSize:13, fontWeight:600, textAlign:'center', cursor:'pointer', display:'block' },
  note:      { background:'#0B1A3580', border:'1px solid #1a3060', borderRadius:10, padding:14, color:'#888', fontSize:13 },
};
