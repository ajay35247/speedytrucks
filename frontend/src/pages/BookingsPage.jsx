/**
 * BookingsPage — Manage all bookings with status lifecycle
 */
import { useState } from "react";
import Layout from "../components/shared/Layout";
import { useAuth } from "../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  confirmed:       { label: "Confirmed",       color: "#1660F5", bg: "#EBF0FF" },
  driver_assigned: { label: "Driver Assigned",  color: "#7C3AED", bg: "#F3EEFF" },
  pickup_started:  { label: "Pickup Started",   color: "#FF5C00", bg: "#FFF0E8" },
  driver_arrived:  { label: "Driver Arrived",   color: "#FF5C00", bg: "#FFF0E8" },
  in_transit:      { label: "In Transit",       color: "#FF5C00", bg: "#FFF0E8" },
  delivered:       { label: "Delivered",        color: "#00C27A", bg: "#E6FBF4" },
  cancelled:       { label: "Cancelled",        color: "#F03D3D", bg: "#FFF0F0" },
};

export default function BookingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [reviewBooking, setReviewBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", filter],
    queryFn: () => api.get(`/bookings${filter ? `?status=${filter}` : ""}`).then(r => r.data.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/bookings/${id}/status`, { status }),
    onSuccess: () => { toast.success("Status updated!"); qc.invalidateQueries(["bookings"]); },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });

  const submitReview = useMutation({
    mutationFn: ({ id }) => api.post(`/bookings/${id}/review`, { rating, comment }),
    onSuccess: () => { toast.success("Review submitted!"); setReviewBooking(null); qc.invalidateQueries(["bookings"]); },
  });

  const driverNextStatus = { confirmed: "pickup_started", pickup_started: "driver_arrived", driver_arrived: "loading", loading: "in_transit", in_transit: "delivered" };

  return (
    <Layout>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {["", "confirmed", "in_transit", "delivered", "cancelled"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: "8px 18px", borderRadius: 24, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: filter === s ? "#1660F5" : "#F0F4FF", color: filter === s ? "#fff" : "#5B6B8A" }}>
            {s ? STATUS_CONFIG[s]?.label : "All Bookings"}
          </button>
        ))}
      </div>

      {isLoading && <div style={{ textAlign: "center", padding: 40, color: "#9DB2CE" }}>Loading...</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data?.bookings?.map(b => {
          const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.confirmed;
          return (
            <div key={b._id} style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", border: "1px solid #F0F4FF", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{ background: cfg.bg, color: cfg.color, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{cfg.label}</span>
                  <span style={{ marginLeft: 10, fontSize: 11, color: "#9DB2CE" }}>#{b._id.slice(-8)}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>₹{b.agreedAmount?.toLocaleString("en-IN")}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#9DB2CE", fontWeight: 600, marginBottom: 3 }}>FROM</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#050D1F" }}>📍 {b.load?.pickup?.city || "N/A"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#9DB2CE", fontWeight: 600, marginBottom: 3 }}>TO</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#050D1F" }}>🎯 {b.load?.delivery?.city || "N/A"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#9DB2CE", fontWeight: 600, marginBottom: 3 }}>DRIVER</div>
                  <div style={{ fontSize: 13, color: "#5B6B8A" }}>{b.driver?.name || "Unassigned"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#9DB2CE", fontWeight: 600, marginBottom: 3 }}>BOOKED ON</div>
                  <div style={{ fontSize: 13, color: "#5B6B8A" }}>{new Date(b.createdAt).toLocaleDateString("en-IN")}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {/* Driver can advance status */}
                {user?.role === "owner" && driverNextStatus[b.status] && (
                  <button onClick={() => updateStatus.mutate({ id: b._id, status: driverNextStatus[b.status] })}
                    style={{ padding: "8px 16px", background: "#1660F5", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                    → Mark as {STATUS_CONFIG[driverNextStatus[b.status]]?.label}
                  </button>
                )}
                {/* Shipper can cancel */}
                {user?.role === "shipper" && b.status === "confirmed" && (
                  <button onClick={() => updateStatus.mutate({ id: b._id, status: "cancelled" })}
                    style={{ padding: "8px 16px", background: "#FFF0F0", border: "none", borderRadius: 10, color: "#F03D3D", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                    Cancel Booking
                  </button>
                )}
                {/* Review after delivery */}
                {b.status === "delivered" && !b.review?.shipperRating && (
                  <button onClick={() => setReviewBooking(b)}
                    style={{ padding: "8px 16px", background: "#F0F4FF", border: "none", borderRadius: 10, color: "#1660F5", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                    ⭐ Leave Review
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!isLoading && !data?.bookings?.length && (
          <div style={{ textAlign: "center", padding: 48, color: "#9DB2CE", background: "#fff", borderRadius: 16, border: "1px solid #F0F4FF" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>No bookings found</div>
          </div>
        )}
      </div>

      {/* Review modal */}
      {reviewBooking && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: 420, maxWidth: "90vw" }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: "#050D1F", fontFamily: "Syne, sans-serif", marginBottom: 20 }}>Rate Your Experience</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "center" }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)}
                  style={{ fontSize: 32, background: "none", border: "none", cursor: "pointer", opacity: n <= rating ? 1 : 0.3, transition: "opacity 0.15s" }}>⭐</button>
              ))}
            </div>
            <textarea placeholder="Share your experience..." value={comment} onChange={e => setComment(e.target.value)}
              rows={3} style={{ width: "100%", padding: "12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 14, resize: "none", outline: "none", marginBottom: 16, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setReviewBooking(null)} style={{ flex: 1, padding: "12px", background: "#F0F4FF", border: "none", borderRadius: 10, color: "#5B6B8A", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => submitReview.mutate({ id: reviewBooking._id })} style={{ flex: 1, padding: "12px", background: "#1660F5", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
