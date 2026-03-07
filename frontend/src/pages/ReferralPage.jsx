/**
 * ReferralPage — Invite friends, earn rewards
 */
import { useState } from "react";
import Layout from "../components/shared/Layout";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import toast from "react-hot-toast";

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);

  const { data } = useQuery({
    queryKey: ["referral"],
    queryFn: () => api.get("/referrals/my").then(r => r.data.data),
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["referralLeaderboard"],
    queryFn: () => api.get("/referrals/leaderboard").then(r => r.data.data.leaders),
  });

  const copyCode = () => {
    navigator.clipboard.writeText(data?.code || "");
    setCopied(true);
    toast.success("Code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(data?.link || "");
    toast.success("Link copied!");
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`Join SpeedyTrucks — India's #1 freight platform! Use my code ${data?.code} and we both earn ₹200! Sign up: ${data?.link}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <Layout>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Hero banner */}
        <div style={{ background: "linear-gradient(135deg,#050D1F,#0B1A35)", borderRadius: 20, padding: "32px 28px", marginBottom: 24, textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", fontFamily: "Syne, sans-serif", marginBottom: 8 }}>Refer & Earn ₹200!</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", maxWidth: 400, margin: "0 auto" }}>Invite drivers and shippers to SpeedyTrucks. Both of you get ₹200 wallet credit when they complete their first booking.</p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Referrals Done", value: data?.completedReferrals || 0, icon: "👥", color: "#1660F5" },
            { label: "Total Earned", value: `₹${(data?.totalEarned || 0).toLocaleString("en-IN")}`, icon: "💰", color: "#00C27A" },
            { label: "Per Referral", value: "₹200", icon: "🎯", color: "#FF5C00" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", borderRadius: 16, padding: "20px 16px", textAlign: "center", border: "1px solid #F0F4FF", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color, fontFamily: "Syne, sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#5B6B8A", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Referral code */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 24, border: "1px solid #F0F4FF", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#050D1F", fontFamily: "Syne, sans-serif", marginBottom: 16 }}>Your Referral Code</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#F8FAFF", borderRadius: 12, padding: "16px 20px", border: "2px dashed #1660F520", marginBottom: 16 }}>
            <span style={{ flex: 1, fontSize: 28, fontWeight: 900, color: "#1660F5", fontFamily: "Syne, sans-serif", letterSpacing: 4 }}>
              {data?.code || "Loading..."}
            </span>
            <button onClick={copyCode} style={{ padding: "10px 20px", background: copied ? "#00C27A" : "#1660F5", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, transition: "all 0.2s" }}>
              {copied ? "✓ Copied!" : "Copy Code"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={copyLink} style={{ flex: 1, padding: "12px", background: "#F0F4FF", border: "none", borderRadius: 10, color: "#1660F5", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              🔗 Copy Link
            </button>
            <button onClick={shareWhatsApp} style={{ flex: 1, padding: "12px", background: "#25D366", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              📱 Share on WhatsApp
            </button>
          </div>
        </div>

        {/* How it works */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 24, border: "1px solid #F0F4FF" }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#050D1F", fontFamily: "Syne, sans-serif", marginBottom: 16 }}>How it works</h3>
          <div style={{ display: "flex", gap: 0 }}>
            {[
              { step: "1", text: "Share your code or link with friends", icon: "📤" },
              { step: "2", text: "They register on SpeedyTrucks", icon: "✍️" },
              { step: "3", text: "They complete first booking", icon: "🚛" },
              { step: "4", text: "Both earn ₹200 wallet credit!", icon: "💰" },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", padding: "0 8px", position: "relative" }}>
                {i < 3 && <div style={{ position: "absolute", top: 20, right: -12, fontSize: 16, color: "#D1DBF5" }}>→</div>}
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#1660F5,#0A3D91)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 10px" }}>{s.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#1660F5", marginBottom: 4 }}>Step {s.step}</div>
                <div style={{ fontSize: 12, color: "#5B6B8A" }}>{s.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        {leaderboard?.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #F0F4FF" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#050D1F", fontFamily: "Syne, sans-serif", marginBottom: 16 }}>🏆 Top Referrers</h3>
            {leaderboard.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < leaderboard.length - 1 ? "1px solid #F8FAFF" : "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#F0F4FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>
                  {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                </div>
                <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: "#050D1F" }}>{l.user?.name}</div>
                <div style={{ fontSize: 13, color: "#5B6B8A" }}>{l.count} referrals</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#00C27A" }}>₹{l.earned}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
