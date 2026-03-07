/**
 * Layout.jsx — Full sidebar navigation v2 with all modules
 */
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";

const NAV = [
  { path: "/dashboard",     label: "Dashboard",      icon: "🏠", roles: ["all"] },
  { path: "/marketplace",   label: "Marketplace",    icon: "🚛", roles: ["all"] },
  { path: "/bookings",      label: "My Bookings",    icon: "📋", roles: ["all"] },
  { path: "/tracking",      label: "Live Tracking",  icon: "📡", roles: ["all"] },
  { path: "/chat",          label: "Messages",       icon: "💬", roles: ["all"] },
  { path: "/post-load",     label: "Post Load",      icon: "📦", roles: ["shipper"] },
  { path: "/wallet",        label: "Wallet",         icon: "💰", roles: ["all"] },
  { path: "/kyc",           label: "KYC / Docs",     icon: "📄", roles: ["all"] },
  { path: "/referral",      label: "Refer & Earn",   icon: "🎁", roles: ["all"] },
  { path: "/notifications", label: "Notifications",  icon: "🔔", roles: ["all"] },
  { path: "/advertiser",    label: "Advertiser",     icon: "📢", roles: ["advertiser","admin"] },
  { path: "/profile",       label: "Profile",        icon: "👤", roles: ["all"] },
  { path: "/admin",         label: "Admin Panel",    icon: "⚙️",  roles: ["admin"] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { data: notifUnread } = useQuery({
    queryKey: ["notifBadge"],
    queryFn: () => api.get("/notifications?limit=1").then(r => r.data.data.unread).catch(() => 0),
    refetchInterval: 30000,
    retry: false,
  });

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    navigate("/login");
  };

  const filtered = NAV.filter(n => n.roles.includes("all") || n.roles.includes(user?.role));

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "DM Sans, sans-serif", background: "#F2F5FC" }}>
      <aside style={{
        width: 240, background: "linear-gradient(180deg,#050D1F 0%,#0B1A35 100%)",
        display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0,
        height: "100vh", zIndex: 100, borderRight: "1px solid rgba(255,255,255,0.05)", overflowY: "auto",
      }}>
        <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#1660F5,#FF5C00)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🚛</div>
            <div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 900, fontSize: 15, color: "#fff" }}>SpeedyTrucks</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>APTRUCKING.IN</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {filtered.map(n => {
            const active = pathname === n.path;
            return (
              <button key={n.path} onClick={() => navigate(n.path)}
                style={{ width: "100%", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, background: active ? "rgba(22,96,245,0.18)" : "transparent", border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 2, borderLeft: active ? "3px solid #1660F5" : "3px solid transparent", transition: "all 0.15s", textAlign: "left", position: "relative" }}>
                <span style={{ fontSize: 16 }}>{n.icon}</span>
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#fff" : "rgba(255,255,255,0.55)" }}>{n.label}</span>
                {n.path === "/notifications" && notifUnread > 0 && (
                  <span style={{ marginLeft: "auto", background: "#F03D3D", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "1px 6px" }}>{notifUnread}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "16px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#1660F5,#FF5C00)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {user?.name?.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: "100%", padding: "8px", background: "rgba(240,61,61,0.12)", border: "1px solid rgba(240,61,61,0.2)", borderRadius: 8, color: "#F03D3D", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Sign Out</button>
        </div>
      </aside>
      <main style={{ marginLeft: 240, flex: 1, padding: "24px 28px", minHeight: "100vh" }}>{children}</main>
    </div>
  );
}
