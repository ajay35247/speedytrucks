/**
 * App Layout – Sidebar + Topbar + Outlet
 */
import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import useAuthStore from "../../context/authStore";
import toast from "react-hot-toast";

const NAV = [
  { path: "/dashboard", icon: "🏠", label: "Dashboard" },
  { path: "/freight", icon: "🚛", label: "Freight Market" },
  { path: "/kyc", icon: "📋", label: "KYC" },
  { path: "/wallet", icon: "💳", label: "Wallet" },
  { path: "/profile", icon: "👤", label: "Profile" },
];

const ADMIN_NAV = [{ path: "/admin", icon: "⚙️", label: "Admin Panel" }];

const ROLE_COLORS = {
  admin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  shipper: "bg-brand/20 text-blue-300 border-brand/30",
  truck_owner: "bg-orange/20 text-orange border-orange/30",
  broker: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    navigate("/login");
  };

  const navItems = user?.role === "admin" ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <div className="flex min-h-screen bg-[#F2F5FC]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-64"} flex-shrink-0 bg-navy flex flex-col transition-all duration-300 relative`}
        style={{ background: "linear-gradient(180deg, #050D1F 0%, #0B1A35 100%)" }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-orange flex items-center justify-center text-lg flex-shrink-0">
            🚛
          </div>
          {!collapsed && (
            <span className="text-lg font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
              SpeedyTrucks
            </span>
          )}
        </div>

        {/* User badge */}
        {!collapsed && user && (
          <div className="mx-3 mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-orange flex items-center justify-center text-xs font-bold text-white">
                {user.name?.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-white text-xs font-bold truncate">{user.name}</div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ROLE_COLORS[user.role]}`}>
                  {user.role?.toUpperCase().replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ path, icon, label }) => {
            const active = location.pathname.startsWith(path);
            return (
              <Link key={path} to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold
                  ${active
                    ? "bg-brand text-white shadow-lg shadow-brand/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}>
                <span className="text-lg">{icon}</span>
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        {/* Collapse + Logout */}
        <div className="p-3 border-t border-white/5 space-y-1">
          {user?.role === "shipper" && !collapsed && (
            <Link to="/freight/post"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-orange/20 border border-orange/30 text-orange text-sm font-bold hover:bg-orange/30 transition-all">
              ＋ Post Load
            </Link>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm font-semibold">
            <span>🚪</span>
            {!collapsed && "Logout"}
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all text-sm">
            <span>{collapsed ? "→" : "←"}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {location.pathname === "/dashboard" && "Dashboard"}
            {location.pathname.includes("/freight") && "Freight Marketplace"}
            {location.pathname.includes("/kyc") && "KYC Verification"}
            {location.pathname.includes("/wallet") && "Wallet & Payments"}
            {location.pathname.includes("/admin") && "Admin Panel"}
          </div>
          <div className="flex items-center gap-3">
            {user?.kyc?.status !== "approved" && user?.role !== "admin" && (
              <Link to="/kyc"
                className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full font-semibold hover:bg-amber-100 transition-all">
                ⚠️ Complete KYC
              </Link>
            )}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-orange flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
          </div>
        </header>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
