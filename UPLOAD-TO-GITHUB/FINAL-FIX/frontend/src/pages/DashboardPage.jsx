import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../context/authStore";

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const roleColor = user?.role === "admin" ? "#ff6b6b" : user?.role === "transporter" ? "#1660F5" : "#00c896";
  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const shipperCards = [
    { icon: "📦", title: "Post a Load", desc: "Find trucks for your cargo", action: () => {} },
    { icon: "📋", title: "My Loads", desc: "View your posted loads", action: () => {} },
    { icon: "📍", title: "Track Shipment", desc: "Live tracking on map", action: () => {} },
    { icon: "💬", title: "Messages", desc: "Chat with transporters", action: () => {} },
  ];

  const transporterCards = [
    { icon: "🔍", title: "Find Loads", desc: "Browse available loads", action: () => {} },
    { icon: "🚛", title: "My Trucks", desc: "Manage your fleet", action: () => {} },
    { icon: "📊", title: "My Bookings", desc: "View accepted bookings", action: () => {} },
    { icon: "💰", title: "Earnings", desc: "Track your income", action: () => {} },
  ];

  const cards = user?.role === "transporter" ? transporterCards : shipperCards;

  return (
    <div style={s.page}>
      {/* Navbar */}
      <nav style={s.nav}>
        <span style={s.navLogo}>🚛 APTrucking</span>
        <div style={s.navRight}>
          <div style={{ ...s.avatar, background: roleColor }}>{initials}</div>
          <button style={s.logoutBtn} onClick={logout}>Sign Out</button>
        </div>
      </nav>

      <div style={s.content}>
        {/* Welcome */}
        <div style={s.welcome}>
          <h1 style={s.welcomeTitle}>Welcome back, {user?.name?.split(" ")[0] || "User"}! 👋</h1>
          <p style={s.welcomeSub}>
            <span style={{ ...s.roleBadge, background: roleColor + "25", color: roleColor }}>
              {user?.role?.toUpperCase()}
            </span>
            &nbsp;&nbsp;{user?.email}
          </p>
        </div>

        {/* Stats Row */}
        <div style={s.statsRow}>
          {[
            { icon: "📦", label: user?.role === "transporter" ? "Loads Taken" : "Loads Posted", value: "0" },
            { icon: "✅", label: "Completed", value: "0" },
            { icon: "⭐", label: "Rating", value: "5.0" },
            { icon: "💰", label: user?.role === "transporter" ? "Earned" : "Spent", value: "₹0" },
          ].map(st => (
            <div key={st.label} style={s.statCard}>
              <span style={s.statIcon}>{st.icon}</span>
              <span style={s.statValue}>{st.value}</span>
              <span style={s.statLabel}>{st.label}</span>
            </div>
          ))}
        </div>

        {/* Action Cards */}
        <h2 style={s.sectionTitle}>Quick Actions</h2>
        <div style={s.grid}>
          {cards.map(c => (
            <div key={c.title} style={s.card} onClick={c.action}>
              <span style={s.cardIcon}>{c.icon}</span>
              <h3 style={s.cardTitle}>{c.title}</h3>
              <p style={s.cardDesc}>{c.desc}</p>
              <span style={s.cardArrow}>→</span>
            </div>
          ))}
        </div>

        {/* Profile Info */}
        <div style={s.profileCard}>
          <h3 style={s.sectionTitle}>My Profile</h3>
          {[
            { label: "Name", value: user?.name },
            { label: "Email", value: user?.email },
            { label: "Phone", value: user?.phone || "Not set" },
            { label: "Company", value: user?.company || "Not set" },
            { label: "Role", value: user?.role },
            { label: "Status", value: user?.status },
          ].map(f => (
            <div key={f.label} style={s.profileRow}>
              <span style={s.profileLabel}>{f.label}</span>
              <span style={s.profileValue}>{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#050D1F" },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "#0B1A35", borderBottom: "1px solid #1a3060" },
  navLogo: { color: "#fff", fontWeight: "bold", fontSize: "18px" },
  navRight: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: { width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "14px" },
  logoutBtn: { background: "transparent", border: "1px solid #ff6b6b40", color: "#ff6b6b", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontSize: "13px" },
  content: { maxWidth: "900px", margin: "0 auto", padding: "24px 20px" },
  welcome: { marginBottom: "28px" },
  welcomeTitle: { color: "#fff", fontSize: "26px", fontWeight: "bold", marginBottom: "8px" },
  welcomeSub: { color: "#888", display: "flex", alignItems: "center", gap: "8px" },
  roleBadge: { borderRadius: "20px", padding: "3px 12px", fontWeight: "bold", fontSize: "12px" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "32px" },
  statCard: { background: "#0B1A35", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" },
  statIcon: { fontSize: "24px" },
  statValue: { color: "#fff", fontSize: "22px", fontWeight: "bold" },
  statLabel: { color: "#888", fontSize: "12px" },
  sectionTitle: { color: "#fff", fontSize: "18px", fontWeight: "bold", marginBottom: "16px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "32px" },
  card: { background: "#0B1A35", borderRadius: "16px", padding: "20px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px", border: "1px solid #1a3060", transition: "border-color 0.2s" },
  cardIcon: { fontSize: "32px" },
  cardTitle: { color: "#fff", fontWeight: "bold", fontSize: "16px" },
  cardDesc: { color: "#888", fontSize: "13px" },
  cardArrow: { color: "#1660F5", fontWeight: "bold", marginTop: "8px" },
  profileCard: { background: "#0B1A35", borderRadius: "16px", padding: "20px", border: "1px solid #1a3060" },
  profileRow: { display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #1a3060" },
  profileLabel: { color: "#888", fontSize: "14px" },
  profileValue: { color: "#fff", fontSize: "14px", fontWeight: "500" },
};
