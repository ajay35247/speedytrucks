import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, password });
      toast.success("Password reset! Please log in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed. Link may be expired.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#050D1F,#112248)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 40, maxWidth: 400, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 16 }}>🔐</div>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color: "#050D1F", marginBottom: 20, textAlign: "center" }}>Reset Password</h1>
        <form onSubmit={handleSubmit}>
          {[["New Password", password, setPassword], ["Confirm Password", confirm, setConfirm]].map(([label, val, set]) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#5B6B8A", marginBottom: 5 }}>{label}</label>
              <input type="password" value={val} onChange={e => set(e.target.value)} placeholder="••••••••" required
                style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "DM Sans, sans-serif" }} />
            </div>
          ))}
          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "13px", background: "#1660F5", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
            {loading ? "Resetting..." : "Reset Password →"}
          </button>
        </form>
      </div>
    </div>
  );
}