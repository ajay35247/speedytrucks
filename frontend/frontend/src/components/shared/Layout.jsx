import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { path: '/dashboard',   icon: '🏠', label: 'Dashboard' },
  { path: '/marketplace', icon: '🔍', label: 'Marketplace' },
  { path: '/kyc',         icon: '📋', label: 'KYC Docs' },
];
const ADMIN_NAV = [{ path: '/admin', icon: '⚙️', label: 'Admin Panel' }];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const nav = user?.role === 'admin' ? [...NAV, ...ADMIN_NAV] : NAV;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const roleColor = { admin: '#ff6b6b', shipper: '#00c896', transporter: '#1660F5', broker: '#f5a623' }[user?.role] || '#888';

  return (
    <div style={s.shell}>
      {/* Mobile overlay */}
      {open && <div style={s.overlay} onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside style={{ ...s.sidebar, transform: open ? 'translateX(0)' : undefined }}>
        <div style={s.sideTop}>
          <span style={s.logo}>🚛 APTrucking</span>
        </div>
        <nav style={s.nav}>
          {nav.map(n => (
            <Link key={n.path} to={n.path} style={{ ...s.navItem, ...(loc.pathname === n.path ? s.navActive : {}) }} onClick={() => setOpen(false)}>
              <span>{n.icon}</span><span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div style={s.sideBottom}>
          <div style={s.userInfo}>
            <div style={{ ...s.avatar, background: roleColor }}>{initials}</div>
            <div>
              <div style={s.userName}>{user?.name}</div>
              <div style={{ ...s.userRole, color: roleColor }}>{user?.role}</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={logout}>Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <div style={s.main}>
        {/* Header */}
        <header style={s.header}>
          <button style={s.burger} onClick={() => setOpen(o => !o)}>☰</button>
          <span style={s.pageTitle}>{nav.find(n => n.path === loc.pathname)?.label || 'APTrucking'}</span>
          <div style={s.headerRight}>
            <span style={{ ...s.badge, background: roleColor + '25', color: roleColor }}>{user?.role?.toUpperCase()}</span>
          </div>
        </header>
        <main style={s.content}>{children}</main>
      </div>
    </div>
  );
}

const s = {
  shell:      { display: 'flex', minHeight: '100vh', background: '#050D1F' },
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 },
  sidebar:    { width: 240, background: '#0B1A35', borderRight: '1px solid #1a3060', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50, transition: 'transform .25s' },
  sideTop:    { padding: '20px 20px 16px' },
  logo:       { color: '#fff', fontWeight: 700, fontSize: 18 },
  nav:        { flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
  navItem:    { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, color: '#888', fontSize: 14, fontWeight: 500, transition: 'all .15s' },
  navActive:  { background: '#1660F520', color: '#fff', borderLeft: '3px solid #1660F5' },
  sideBottom: { padding: 16, borderTop: '1px solid #1a3060' },
  userInfo:   { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar:     { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  userName:   { color: '#fff', fontSize: 13, fontWeight: 600 },
  userRole:   { fontSize: 11, marginTop: 2 },
  logoutBtn:  { width: '100%', background: 'transparent', border: '1px solid #ff6b6b40', color: '#ff6b6b', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 600 },
  main:       { flex: 1, marginLeft: 240, display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  header:     { background: '#0B1A35', borderBottom: '1px solid #1a3060', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 30 },
  burger:     { background: 'none', border: 'none', color: '#888', fontSize: 20, display: 'none' },
  pageTitle:  { color: '#fff', fontWeight: 700, fontSize: 16, flex: 1 },
  headerRight:{ display: 'flex', alignItems: 'center', gap: 12 },
  badge:      { borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 },
  content:    { flex: 1, padding: 24, maxWidth: 1100, width: '100%', margin: '0 auto' },
};
