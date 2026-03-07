/**
 * NotificationsPage
 */
import Layout from "../components/shared/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import toast from "react-hot-toast";

const TYPE_ICONS = {
  load_posted: "📦", bid_placed: "💼", bid_accepted: "✅",
  booking_confirmed: "🎉", driver_arrived: "🚛", payment_completed: "💰",
  delivery_completed: "📍", kyc_approved: "✅", kyc_rejected: "❌",
  referral_reward: "🎁", system: "🔔", fraud_alert: "⚠️",
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications").then(r => r.data.data),
  });

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries(["notifications"]),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => { toast.success("All marked as read"); qc.invalidateQueries(["notifications"]); },
  });

  const relativeTime = (d) => {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s/60) + "m ago";
    if (s < 86400) return Math.floor(s/3600) + "h ago";
    return Math.floor(s/86400) + "d ago";
  };

  return (
    <Layout>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>🔔 Notifications</h1>
            {data?.unread > 0 && <p style={{ fontSize: 13, color: "#5B6B8A", marginTop: 4 }}>{data.unread} unread</p>}
          </div>
          {data?.unread > 0 && (
            <button onClick={() => markAllRead.mutate()}
              style={{ padding: "8px 16px", background: "#F0F4FF", border: "none", borderRadius: 10, color: "#1660F5", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Mark all read
            </button>
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0F4FF", overflow: "hidden" }}>
          {isLoading && <div style={{ padding: 32, textAlign: "center", color: "#9DB2CE" }}>Loading...</div>}
          {!isLoading && !data?.notifications?.length && (
            <div style={{ padding: 48, textAlign: "center", color: "#9DB2CE" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>No notifications yet</div>
            </div>
          )}
          {data?.notifications?.map((n, i) => (
            <div key={n._id}
              onClick={() => !n.read && markRead.mutate(n._id)}
              style={{
                padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start",
                background: n.read ? "#fff" : "#F8FAFF",
                borderBottom: i < data.notifications.length - 1 ? "1px solid #F0F4FF" : "none",
                cursor: n.read ? "default" : "pointer", transition: "background 0.2s",
              }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: n.read ? "#F0F4FF" : "#E8F0FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {TYPE_ICONS[n.type] || "🔔"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: n.read ? 600 : 800, color: "#050D1F", fontFamily: "DM Sans, sans-serif" }}>{n.title}</div>
                  {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1660F5", flexShrink: 0, marginTop: 4 }} />}
                </div>
                <div style={{ fontSize: 13, color: "#5B6B8A", marginTop: 4 }}>{n.body}</div>
                <div style={{ fontSize: 11, color: "#9DB2CE", marginTop: 6 }}>{relativeTime(n.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
