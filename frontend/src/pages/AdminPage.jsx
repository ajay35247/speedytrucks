import { useState } from "react";
import Layout from "../components/shared/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminAPI } from "../services/api";
import toast from "react-hot-toast";

const ROLE_COLORS = { admin: "#7C3AED", shipper: "#1660F5", owner: "#FF5C00", broker: "#00C27A" };
const STATUS_COLORS = { active: "#00C27A", suspended: "#F5A623", pending_kyc: "#1660F5", banned: "#F03D3D" };

const tabs = ["Users", "KYC Approval", "Audit Logs", "Stats"];

export default function AdminPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("Users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendModal, setSuspendModal] = useState(null);

  const { data: stats } = useQuery({ queryKey: ["adminStats"], queryFn: () => adminAPI.getStats().then(r => r.data.data) });
  const { data: users, isLoading } = useQuery({ queryKey: ["adminUsers", search, roleFilter], queryFn: () => adminAPI.getUsers({ search, role: roleFilter }).then(r => r.data.data) });
  const { data: pendingKYC } = useQuery({ queryKey: ["pendingKYC"], queryFn: () => adminAPI.getPendingKYC().then(r => r.data.data) });
  const { data: auditLogs } = useQuery({ queryKey: ["auditLogs"], queryFn: () => adminAPI.getAuditLogs().then(r => r.data.data) });

  const suspendMut = useMutation({ mutationFn: ({ id, reason }) => adminAPI.suspendUser(id, reason), onSuccess: () => { toast.success("User suspended"); setSuspendModal(null); qc.invalidateQueries(["adminUsers"]); } });
  const reinstateMut = useMutation({ mutationFn: (id) => adminAPI.reinstateUser(id), onSuccess: () => { toast.success("User reinstated"); qc.invalidateQueries(["adminUsers"]); } });
  const approveKYCMut = useMutation({ mutationFn: (id) => adminAPI.approveKYC(id), onSuccess: () => { toast.success("KYC approved"); qc.invalidateQueries(["pendingKYC"]); } });
  const rejectKYCMut = useMutation({ mutationFn: ({ id, reason }) => adminAPI.rejectKYC(id, reason), onSuccess: () => { toast.success("KYC rejected"); qc.invalidateQueries(["pendingKYC"]); } });

  return (
    <Layout>
      <div style={{ animation: "fadeUp 0.5s ease" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#050D1F", fontFamily: "Syne, sans-serif", marginBottom: 4 }}>⚙️ Admin Panel</h1>
        <p style={{ fontSize: 13, color: "#5B6B8A", marginBottom: 24 }}>Platform management dashboard</p>

        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
            {[["👥", "Total Users", stats.totalUsers], ["✅", "Active Users", stats.activeUsers], ["⏳", "Pending KYC", stats.pendingKYC], ["🚛", "Truck Owners", stats.usersByRole?.owner || 0]].map(([ic, label, val]) => (
              <div key={label} style={{ background: "#fff", borderRadius: 14, padding: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #F0F4FF" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{ic}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>{val}</div>
                <div style={{ fontSize: 11, color: "#5B6B8A", fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#F8FAFF", borderRadius: 12, padding: 4, marginBottom: 20, width: "fit-content" }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ padding: "8px 20px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "DM Sans, sans-serif", background: activeTab === t ? "#fff" : "transparent", color: activeTab === t ? "#050D1F" : "#5B6B8A", boxShadow: activeTab === t ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === "Users" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F0F4FF" }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <input placeholder="🔍 Search by name, email, phone..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, outline: "none" }} />
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                style={{ padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, outline: "none", background: "#fff" }}>
                <option value="">All Roles</option>
                {["admin","shipper","owner","broker"].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {isLoading ? <div style={{ textAlign: "center", padding: 40 }}>Loading...</div> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #F0F4FF" }}>
                    {["User", "Role", "Status", "KYC", "Joined", "Actions"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#5B6B8A", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(users?.users || []).map(u => (
                    <tr key={u._id} style={{ borderBottom: "1px solid #F8F9FF" }}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${ROLE_COLORS[u.role]}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: ROLE_COLORS[u.role] }}>
                            {u.name?.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#050D1F" }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: "#5B6B8A" }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ background: `${ROLE_COLORS[u.role]}15`, color: ROLE_COLORS[u.role], padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{u.role}</span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ background: `${STATUS_COLORS[u.status]}15`, color: STATUS_COLORS[u.status], padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{u.status}</span>
                      </td>
                      <td style={{ padding: "12px", fontSize: 12, color: u.kycStatus === "approved" ? "#00C27A" : "#F5A623", fontWeight: 600 }}>{u.kycStatus}</td>
                      <td style={{ padding: "12px", fontSize: 11, color: "#5B6B8A" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {u.status !== "suspended" ? (
                            <button onClick={() => setSuspendModal(u)}
                              style={{ padding: "5px 12px", background: "#FEF2F2", border: "1px solid #F0303020", borderRadius: 7, color: "#F03030", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Suspend</button>
                          ) : (
                            <button onClick={() => reinstateMut.mutate(u._id)}
                              style={{ padding: "5px 12px", background: "#E6FBF4", border: "1px solid #00C27A20", borderRadius: 7, color: "#00C27A", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Reinstate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* KYC Tab */}
        {activeTab === "KYC Approval" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F0F4FF" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#050D1F", marginBottom: 20 }}>⏳ Pending KYC Reviews ({pendingKYC?.total || 0})</h3>
            {(pendingKYC?.kycs || []).map(kyc => (
              <div key={kyc._id} style={{ border: "1px solid #F0F4FF", borderRadius: 14, padding: 20, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#050D1F" }}>{kyc.user?.name}</div>
                    <div style={{ fontSize: 12, color: "#5B6B8A" }}>{kyc.user?.email} • {kyc.user?.role?.toUpperCase()}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#5B6B8A" }}>Submitted: {new Date(kyc.submittedAt).toLocaleDateString()}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {["pan", "aadhaar", "drivingLicense", "rc", "gst", "selfie"].filter(k => kyc[k]?.url).map(doc => (
                    <a key={doc} href={kyc[doc].url} target="_blank" rel="noreferrer"
                      style={{ padding: "6px 14px", background: "#EEF4FF", borderRadius: 8, color: "#1660F5", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                      📄 {doc}
                    </a>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => approveKYCMut.mutate(kyc.user._id)}
                    style={{ padding: "9px 20px", background: "#00C27A", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✅ Approve KYC</button>
                  <button onClick={() => { const r = prompt("Rejection reason:"); if (r) rejectKYCMut.mutate({ id: kyc.user._id, reason: r }); }}
                    style={{ padding: "9px 20px", background: "#F03D3D", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>❌ Reject KYC</button>
                </div>
              </div>
            ))}
            {(!pendingKYC?.kycs || pendingKYC.kycs.length === 0) && <div style={{ textAlign: "center", padding: 40, color: "#8B9CB8" }}>No pending KYC reviews 🎉</div>}
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === "Audit Logs" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F0F4FF" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#050D1F", marginBottom: 20 }}>📊 Platform Audit Log</h3>
            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              {(auditLogs?.logs || []).map(log => (
                <div key={log._id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F8F9FF" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: log.status === "success" ? "#E6FBF4" : "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                    {log.status === "success" ? "✅" : "❌"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#050D1F" }}>{log.action}</div>
                    <div style={{ fontSize: 11, color: "#5B6B8A" }}>{log.user?.name || "System"} • {log.detail}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: "#8B9CB8", fontFamily: "JetBrains Mono, monospace" }}>{log.ip}</div>
                    <div style={{ fontSize: 10, color: "#8B9CB8" }}>{new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === "Stats" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#050D1F", marginBottom: 20 }}>📈 Platform Statistics</h3>
            {stats?.usersByRole && Object.entries(stats.usersByRole).map(([role, count]) => (
              <div key={role} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <div style={{ width: 80, fontSize: 12, fontWeight: 700, color: "#050D1F", textTransform: "capitalize" }}>{role}</div>
                <div style={{ flex: 1, height: 12, background: "#F0F4FF", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ width: `${(count / (stats.totalUsers || 1)) * 100}%`, height: "100%", background: ROLE_COLORS[role] || "#1660F5", borderRadius: 6 }} />
                </div>
                <div style={{ width: 30, textAlign: "right", fontSize: 13, fontWeight: 800, color: ROLE_COLORS[role] || "#1660F5" }}>{count}</div>
              </div>
            ))}
          </div>
        )}

        {/* Suspend Modal */}
        {suspendModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 400, width: "90%" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#050D1F", marginBottom: 8 }}>Suspend {suspendModal.name}?</h3>
              <p style={{ fontSize: 12, color: "#5B6B8A", marginBottom: 16 }}>This will prevent the user from accessing the platform.</p>
              <textarea placeholder="Reason for suspension..." value={suspendReason} onChange={e => setSuspendReason(e.target.value)} rows={3}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, outline: "none", resize: "none", fontFamily: "DM Sans, sans-serif" }} />
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button onClick={() => suspendMut.mutate({ id: suspendModal._id, reason: suspendReason })}
                  style={{ flex: 1, padding: "11px", background: "#F03D3D", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Suspend User</button>
                <button onClick={() => setSuspendModal(null)}
                  style={{ flex: 1, padding: "11px", border: "1.5px solid #E2E8F0", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#5B6B8A" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}