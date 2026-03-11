import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: '📦', title: 'Post Load', desc: 'List your freight and get instant bids from verified carriers.' },
  { icon: '🚛', title: 'Find Trucks', desc: 'Search available trucks by route, capacity, and type.' },
  { icon: '📍', title: 'Live Tracking', desc: 'Track your shipment in real-time from pickup to delivery.' },
  { icon: '⚡', title: 'Instant Bidding', desc: 'AI-powered freight matching for the best price and speed.' },
  { icon: '🔐', title: 'Secure Payments', desc: 'Razorpay-powered payments with escrow protection.' },
  { icon: '📋', title: 'KYC Verified', desc: 'All transporters are background-checked and verified.' },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div style={s.page}>
      {/* Navbar */}
      <nav style={s.nav}>
        <span style={s.logo}>🚛 APTrucking</span>
        <div style={s.navLinks}>
          {user ? (
            <Link to="/dashboard" style={s.btnPrimary}>Dashboard →</Link>
          ) : (
            <>
              <Link to="/login"    style={s.btnOutline}>Login</Link>
              <Link to="/register" style={s.btnPrimary}>Register Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <div style={s.heroBadge}>🇮🇳 India's #1 Freight Marketplace</div>
        <h1 style={s.heroTitle}>Move Freight Faster.<br />Earn More. Track Live.</h1>
        <p style={s.heroSub}>Connecting shippers and truck owners across India. Fast, reliable, transparent logistics — powered by technology.</p>
        <div style={s.heroBtns}>
          <Link to={user ? '/marketplace' : '/register'} style={s.btnPrimary}>Post a Load →</Link>
          <Link to={user ? '/marketplace' : '/register'} style={s.btnOutline}>Find Trucks</Link>
        </div>
        <div style={s.heroStats}>
          {[['10,000+','Loads Posted'],['5,000+','Verified Trucks'],['₹50Cr+','Freight Moved']].map(([v,l])=>(
            <div key={l} style={s.stat}><span style={s.statVal}>{v}</span><span style={s.statLbl}>{l}</span></div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Everything You Need</h2>
        <div style={s.grid}>
          {FEATURES.map(f => (
            <div key={f.title} style={s.card}>
              <span style={s.cardIcon}>{f.icon}</span>
              <h3 style={s.cardTitle}>{f.title}</h3>
              <p style={s.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section style={s.cta}>
          <h2 style={s.ctaTitle}>Ready to transform your logistics?</h2>
          <p style={s.ctaSub}>Join 15,000+ shippers and truck owners on APTrucking</p>
          <Link to="/register" style={s.btnPrimary}>Get Started Free →</Link>
        </section>
      )}

      {/* Footer */}
      <footer style={s.footer}>
        <span>© 2026 APTrucking · <a href="mailto:support@aptrucking.in" style={{color:'#1660F5'}}>support@aptrucking.in</a></span>
        <div style={{display:'flex',gap:20}}>
          <Link to="/login"    style={s.footerLink}>Login</Link>
          <Link to="/register" style={s.footerLink}>Register</Link>
        </div>
      </footer>
    </div>
  );
}

const s = {
  page:       { minHeight: '100vh', background: '#050D1F' },
  nav:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 40px', background: '#0B1A35', borderBottom: '1px solid #1a3060', position: 'sticky', top: 0, zIndex: 50 },
  logo:       { color: '#fff', fontWeight: 700, fontSize: 20 },
  navLinks:   { display: 'flex', gap: 12 },
  btnPrimary: { background: '#1660F5', color: '#fff', borderRadius: 10, padding: '10px 22px', fontWeight: 600, fontSize: 14 },
  btnOutline: { background: 'transparent', color: '#fff', borderRadius: 10, padding: '10px 22px', fontWeight: 600, fontSize: 14, border: '1px solid #1a3060' },
  hero:       { textAlign: 'center', padding: '80px 24px 60px' },
  heroBadge:  { display: 'inline-block', background: '#1660F520', color: '#1660F5', borderRadius: 20, padding: '6px 18px', fontSize: 13, fontWeight: 600, marginBottom: 24 },
  heroTitle:  { color: '#fff', fontSize: 52, fontWeight: 800, lineHeight: 1.15, marginBottom: 20 },
  heroSub:    { color: '#888', fontSize: 18, maxWidth: 580, margin: '0 auto 32px' },
  heroBtns:   { display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 48 },
  heroStats:  { display: 'flex', gap: 48, justifyContent: 'center' },
  stat:       { display: 'flex', flexDirection: 'column', gap: 4 },
  statVal:    { color: '#fff', fontSize: 28, fontWeight: 800 },
  statLbl:    { color: '#888', fontSize: 13 },
  section:    { padding: '60px 40px' },
  sectionTitle:{ color: '#fff', fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 40 },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, maxWidth: 1100, margin: '0 auto' },
  card:       { background: '#0B1A35', borderRadius: 16, padding: 28, border: '1px solid #1a3060' },
  cardIcon:   { fontSize: 36 },
  cardTitle:  { color: '#fff', fontSize: 18, fontWeight: 700, margin: '12px 0 8px' },
  cardDesc:   { color: '#888', fontSize: 14, lineHeight: 1.6 },
  cta:        { background: '#0B1A35', borderTop: '1px solid #1a3060', padding: '60px 24px', textAlign: 'center' },
  ctaTitle:   { color: '#fff', fontSize: 32, fontWeight: 800, marginBottom: 12 },
  ctaSub:     { color: '#888', fontSize: 16, marginBottom: 28 },
  footer:     { background: '#0B1A35', borderTop: '1px solid #1a3060', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', fontSize: 13 },
  footerLink: { color: '#888' },
};
