/**
 * AdvertiserPage — Ad campaign creation and analytics dashboard
 */
import { useState } from "react";
import Layout from "../components/shared/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import toast from "react-hot-toast";

const STATUS_COLOR = { draft: "#9DB2CE", active: "#00C27A", paused: "#FF5C00", completed: "#7C3AED", rejected: "#F03D3D" };

export default function AdvertiserPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "banner", pricingModel: "cpc", budget: "", cpcRate: 5,
    creative: { title: "", description: "", ctaText: "Learn More", ctaUrl: "" },
    startDate: "", endDate: "",
  });

  const { data: campaigns } = useQuery({
    queryKey: ["myCampaigns"],
    queryFn: () => api.get("/ads/my").then(r => r.data.data.campaigns),
  });

  const create = useMutation({
    mutationFn: (d) => api.post("/ads", d),
    onSuccess: () => { toast.success("Campaign submitted for review!"); setShowForm(false); qc.invalidateQueries(["myCampaigns"]); },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });

  const setF = (key, val) => setForm(prev => {
    if (key.startsWith("creative.")) {
      return { ...prev, creative: { ...prev.creative, [key.split(".")[1]]: val } };
    }
    return { ...prev, [key]: val };
  });

  const totalSpend = campaigns?.reduce((s, c) => s + c.spent, 0) || 0;
  const totalImpressions = campaigns?.reduce((s, c) => s + c.stats?.impressions, 0) || 0;
  const totalClicks = campaigns?.reduce((s, c) => s + c.stats?.clicks, 0) || 0;

  return (
    <Layout>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Campaigns", value: campaigns?.length || 0, icon: "📢" },
          { label: "Total Spend", value: `₹${totalSpend.toLocaleString("en-IN")}`, icon: "💰" },
          { label: "Impressions", value: totalImpressions.toLocaleString("en-IN"), icon: "👁️" },
          { label: "Clicks", value: totalClicks.toLocaleString("en-IN"), icon: "🖱️" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 16, padding: "18px 16px", border: "1px solid #F0F4FF", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#5B6B8A", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>📢 Ad Campaigns</h2>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: "10px 20px", background: "#1660F5", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          + New Campaign
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 24, border: "2px solid #1660F520", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, fontFamily: "Syne, sans-serif" }}>Create Campaign</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[["name","Campaign Name"],["budget","Budget (₹)"],["cpcRate","CPC Rate (₹)"],["startDate","Start Date"],["endDate","End Date"],["creative.title","Ad Title"],["creative.ctaUrl","CTA URL"]].map(([k,l]) => (
              <div key={k}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#5B6B8A", display: "block", marginBottom: 5 }}>{l}</label>
                <input type={k.includes("Date") ? "date" : k === "budget" || k === "cpcRate" ? "number" : "text"}
                  value={k.startsWith("creative.") ? form.creative[k.split(".")[1]] : form[k]}
                  onChange={e => setF(k, e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#5B6B8A", display: "block", marginBottom: 5 }}>Ad Type</label>
              <select value={form.type} onChange={e => setF("type", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, outline: "none" }}>
                {["banner","sidebar","sponsored_truck","sponsored_load"].map(t => <option key={t} value={t}>{t.replace("_"," ").toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#5B6B8A", display: "block", marginBottom: 5 }}>Pricing Model</label>
              <select value={form.pricingModel} onChange={e => setF("pricingModel", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, outline: "none" }}>
                <option value="cpc">CPC — Cost Per Click</option>
                <option value="cpm">CPM — Cost Per 1000 Impressions</option>
                <option value="fixed">Fixed Price</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "12px 24px", background: "#F0F4FF", border: "none", borderRadius: 10, color: "#5B6B8A", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            <button onClick={() => create.mutate(form)} style={{ padding: "12px 24px", background: "#1660F5", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Submit for Review</button>
          </div>
        </div>
      )}

      {/* Campaigns list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {campaigns?.map(c => (
          <div key={c._id} style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #F0F4FF", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>{c.name}</h4>
                <span style={{ fontSize: 11, color: "#5B6B8A" }}>{c.type?.replace("_"," ").toUpperCase()} • {c.pricingModel?.toUpperCase()}</span>
              </div>
              <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: STATUS_COLOR[c.status] + "20", color: STATUS_COLOR[c.status] }}>
                {c.status?.toUpperCase()}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[["Budget", `₹${c.budget}`],["Spent", `₹${c.spent}`],["Impressions", c.stats?.impressions?.toLocaleString()],["Clicks", c.stats?.clicks]].map(([l,v]) => (
                <div key={l} style={{ textAlign: "center", padding: "8px", background: "#F8FAFF", borderRadius: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>{v}</div>
                  <div style={{ fontSize: 11, color: "#5B6B8A" }}>{l}</div>
                </div>
              ))}
            </div>
            {c.rejectionReason && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: "#FFF0F0", borderRadius: 8, fontSize: 12, color: "#F03D3D" }}>
                ❌ Rejected: {c.rejectionReason}
              </div>
            )}
          </div>
        ))}
        {!campaigns?.length && (
          <div style={{ textAlign: "center", padding: 48, background: "#fff", borderRadius: 16, border: "1px solid #F0F4FF", color: "#9DB2CE" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📢</div>
            <div style={{ fontWeight: 700 }}>No campaigns yet. Create your first ad!</div>
          </div>
        )}
      </div>
    </Layout>
  );
}
