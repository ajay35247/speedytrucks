import { useState } from "react";
import Layout from "../components/shared/Layout";
import { useAuth } from "../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { freightAPI, bidAPI } from "../services/api";
import toast from "react-hot-toast";

const STATUS_COLORS = { open: "#00C27A", bidding: "#1660F5", assigned: "#FF5C00", in_transit: "#7C3AED", delivered: "#059669", cancelled: "#F03D3D" };

export default function MarketplacePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ from: "", to: "", truckType: "" });
  const [showPostForm, setShowPostForm] = useState(false);
  const [newLoad, setNewLoad] = useState({ title: "", pickup: { city: "", address: "" }, delivery: { city: "", address: "" }, weight: "", budget: "", truckType: "medium", pickupDate: "" });
  const [bidForm, setBidForm] = useState({ loadId: null, amount: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["loads", filters],
    queryFn: () => freightAPI.getLoads(filters).then(r => r.data.data),
  });

  const postMutation = useMutation({
    mutationFn: (d) => freightAPI.postLoad(d),
    onSuccess: () => { toast.success("Load posted!"); setShowPostForm(false); qc.invalidateQueries(["loads"]); },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to post load"),
  });

  const bidMutation = useMutation({
    mutationFn: (d) => bidAPI.placeBid(d),
    onSuccess: () => { toast.success("Bid placed!"); setBidForm({ loadId: null, amount: "" }); qc.invalidateQueries(["loads"]); },
    onError: (e) => toast.error(e.response?.data?.message || "Bid failed"),
  });

  const setNL = (path, val) => setNewLoad(prev => {
    const next = { ...prev };
    const parts = path.split(".");
    if (parts.length === 2) next[parts[0]] = { ...next[parts[0]], [parts[1]]: val };
    else next[path] = val;
    return next;
  });

  return (
    <Layout>
      <div style={{ animation: "fadeUp 0.5s ease" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>🚛 Freight Marketplace</h1>
            <p style={{ fontSize: 13, color: "#5B6B8A" }}>Browse and bid on available freight loads across India</p>
          </div>
          {user?.role === "shipper" && (
            <button onClick={() => setShowPostForm(!showPostForm)}
              style={{ padding: "12px 24px", background: "#1660F5", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              + Post New Load
            </button>
          )}
        </div>

        {/* Post Load Form */}
        {showPostForm && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 24, border: "2px solid #1660F520", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#050D1F", fontFamily: "Syne, sans-serif", marginBottom: 20 }}>📦 Post New Load</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[["title", "Load Title", ""], ["pickup.city", "Pickup City", ""], ["pickup.address", "Pickup Address", ""], ["delivery.city", "Delivery City", ""], ["delivery.address", "Delivery Address", ""], ["weight", "Weight (tonnes)", "number"], ["budget", "Budget (₹)", "number"], ["pickupDate", "Pickup Date", "date"]].map(([key, label, type]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5B6B8A", marginBottom: 5 }}>{label}</label>
                  <input type={type || "text"}
                    value={key.includes(".") ? (newLoad[key.split(".")[0]] || {})[key.split(".")[1]] || "" : newLoad[key] || ""}
                    onChange={e => setNL(key, e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "DM Sans, sans-serif" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5B6B8A", marginBottom: 5 }}>Truck Type</label>
                <select value={newLoad.truckType} onChange={e => setNL("truckType", e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "DM Sans, sans-serif" }}>
                  {["mini","small","medium","large","trailer"].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={() => postMutation.mutate(newLoad)} disabled={postMutation.isPending}
                style={{ padding: "12px 28px", background: "#1660F5", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {postMutation.isPending ? "Posting..." : "Post Load"}
              </button>
              <button onClick={() => setShowPostForm(false)}
                style={{ padding: "12px 20px", border: "1.5px solid #E2E8F0", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 13, color: "#5B6B8A", fontWeight: 600 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          {[["from","From City","🏙️"],["to","To City","📍"]].map(([k,ph,ic]) => (
            <div key={k} style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>{ic}</span>
              <input placeholder={ph} value={filters[k]} onChange={e => setFilters(p => ({ ...p, [k]: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px 9px 32px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, outline: "none" }} />
            </div>
          ))}
          <select value={filters.truckType} onChange={e => setFilters(p => ({ ...p, truckType: e.target.value }))}
            style={{ padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, outline: "none", background: "#fff" }}>
            <option value="">All Truck Types</option>
            {["mini","small","medium","large","trailer"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Loads grid */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 60 }}><div style={{ width: 36, height: 36, borderRadius: "50%", border: "4px solid #1660F5", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", display: "inline-block" }} /></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {(data?.loads || []).map(load => (
              <div key={load._id} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F0F4FF" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#050D1F" }}>{load.title}</div>
                    <div style={{ fontSize: 11, color: "#5B6B8A", marginTop: 2 }}>{load.shipper?.company || load.shipper?.name}</div>
                  </div>
                  <div style={{ background: `${STATUS_COLORS[load.status]}15`, color: STATUS_COLORS[load.status], padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{load.status?.toUpperCase()}</div>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, fontSize: 12, color: "#5B6B8A" }}>
                  <span>📍 {load.pickup?.city}</span><span>→</span><span>🏁 {load.delivery?.city}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[["⚖️", `${load.weight}t`],["🚛", load.truckType],["💰", `₹${load.budget?.toLocaleString()}`]].map(([ic,v],i) => (
                    <div key={i} style={{ background: "#F8FAFF", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 14 }}>{ic}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#050D1F" }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Bid section for truck owners */}
                {user?.role === "owner" && load.status !== "cancelled" && (
                  bidForm.loadId === load._id ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="number" placeholder="Your bid (₹)" value={bidForm.amount} onChange={e => setBidForm(p => ({...p, amount: e.target.value}))}
                        style={{ flex: 1, padding: "9px 12px", border: "1.5px solid #1660F5", borderRadius: 9, fontSize: 13, outline: "none" }} />
                      <button onClick={() => bidMutation.mutate({ loadId: load._id, amount: Number(bidForm.amount) })}
                        style={{ padding: "9px 16px", background: "#1660F5", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        {bidMutation.isPending ? "..." : "Submit"}
                      </button>
                      <button onClick={() => setBidForm({ loadId: null, amount: "" })}
                        style={{ padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, background: "#fff", cursor: "pointer", fontSize: 12, color: "#5B6B8A" }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setBidForm({ loadId: load._id, amount: "" })}
                      style={{ width: "100%", padding: "10px", background: "#EEF4FF", border: "1.5px solid #1660F520", borderRadius: 10, color: "#1660F5", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      🤝 Place Bid
                    </button>
                  )
                )}
              </div>
            ))}
            {data?.loads?.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#8B9CB8" }}>
                <div style={{ fontSize: 48 }}>🔍</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>No loads found</div>
                <div style={{ fontSize: 13 }}>Try adjusting your filters</div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}