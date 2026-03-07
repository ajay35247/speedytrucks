import Layout from "../components/shared/Layout";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { freightAPI, bidAPI, paymentAPI } from "../services/api";

const StatCard = ({ icon, label, value, color, bg }) => (
  <div style={{ background: "#fff", borderRadius: 16, padding: 20, display: "flex", gap: 14, alignItems: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F0F4FF" }}>
    <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 11, color: "#5B6B8A", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>{value}</div>
    </div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: myLoads } = useQuery({ queryKey: ["myLoads"], queryFn: () => freightAPI.myLoads().then(r => r.data.data.loads), enabled: user?.role === "shipper" });
  const { data: myBids }  = useQuery({ queryKey: ["myBids"],  queryFn: () => bidAPI.myBids().then(r => r.data.data.bids),   enabled: user?.role === "owner" });
  const { data: wallet }  = useQuery({ queryKey: ["wallet"],  queryFn: () => paymentAPI.getWallet().then(r => r.data.data)  });

  const ROLE_COLORS = { admin: "#7C3AED", shipper: "#1660F5", owner: "#FF5C00", broker: "#00C27A" };
  const roleColor = ROLE_COLORS[user?.role] || "#1660F5";

  return (
    <Layout>
      <div style={{ animation: "fadeUp 0.5s ease" }}>
        {/* Welcome banner */}
        <div style={{ background: "linear-gradient(135deg,#050D1F,#0B1A35)", borderRadius: 20, padding: "24px 28px", marginBottom: 24, display: "flex", gap: 16, alignItems: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg,${roleColor},#FF5C00)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: "Syne, sans-serif", flexShrink: 0 }}>
            {user?.name?.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", fontFamily: "Syne, sans-serif" }}>Welcome back, {user?.name?.split(" ")[0]}! 👋</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
              <span style={{ color: roleColor, fontWeight: 700 }}>{user?.role?.toUpperCase()}</span>
              {user?.company && ` • ${user.company}`} • {user?.email}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 16px", textAlign: "right", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>KYC Status</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: user?.kycStatus === "approved" ? "#00C27A" : "#F5A623", marginTop: 2 }}>
              {user?.kycStatus === "approved" ? "✅ Verified" : user?.kycStatus === "pending" ? "⏳ Pending" : "⚠️ Required"}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
          <StatCard icon="💰" label="Wallet Balance" value={`₹${(wallet?.balance || 0).toLocaleString("en-IN")}`} color="#00C27A" bg="#E6FBF4" />
          {user?.role === "shipper" && <StatCard icon="📦" label="Active Loads" value={myLoads?.filter(l => l.status === "open")?.length || 0} color="#1660F5" bg="#EEF4FF" />}
          {user?.role === "owner" && <StatCard icon="🤝" label="Active Bids" value={myBids?.filter(b => b.status === "pending")?.length || 0} color="#FF5C00" bg="#FFF0E6" />}
          <StatCard icon="🔐" label="2FA Security" value={user?.twoFactorEnabled ? "Enabled" : "Disabled"} color={user?.twoFactorEnabled ? "#00C27A" : "#F5A623"} bg={user?.twoFactorEnabled ? "#E6FBF4" : "#FFFBEB"} />
          <StatCard icon="📋" label="KYC Docs" value={user?.kycStatus === "approved" ? "Verified" : "Pending"} color="#7C3AED" bg="#F3E8FF" />
        </div>

        {/* Loads / Bids tables */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Recent loads for shipper */}
          {user?.role === "shipper" && (
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F0F4FF" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#050D1F", fontFamily: "Syne, sans-serif", marginBottom: 16 }}>📦 Recent Loads</div>
              {(myLoads || []).slice(0, 5).map(load => (
                <div key={load._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F8F9FF" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#050D1F" }}>{load.title}</div>
                    <div style={{ fontSize: 11, color: "#5B6B8A" }}>{load.pickup?.city} → {load.delivery?.city}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1660F5" }}>₹{load.budget?.toLocaleString()}</div>
                    <div style={{ fontSize: 10, background: "#EEF4FF", color: "#1660F5", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{load.status}</div>
                  </div>
                </div>
              ))}
              {(!myLoads || myLoads.length === 0) && <div style={{ textAlign: "center", color: "#8B9CB8", fontSize: 13, padding: 20 }}>No loads yet. Post your first load!</div>}
            </div>
          )}

          {/* Wallet transactions */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F0F4FF" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#050D1F", fontFamily: "Syne, sans-serif", marginBottom: 16 }}>💸 Recent Transactions</div>
            {(wallet?.transactions || []).slice(0, 5).map(tx => (
              <div key={tx._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F8F9FF" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#050D1F" }}>{tx.description}</div>
                  <div style={{ fontSize: 10, color: "#5B6B8A" }}>{new Date(tx.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: tx.type === "credit" ? "#00C27A" : "#F03D3D" }}>
                  {tx.type === "credit" ? "+" : "-"}₹{tx.amount?.toLocaleString()}
                </div>
              </div>
            ))}
            {(!wallet?.transactions || wallet.transactions.length === 0) && <div style={{ textAlign: "center", color: "#8B9CB8", fontSize: 13, padding: 20 }}>No transactions yet.</div>}
          </div>
        </div>
      </div>
    </Layout>
  );
}