import { useState } from "react";
import { Link } from "react-router-dom";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
      toast.success("Reset link sent if email exists");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#050D1F,#112248)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 40, maxWidth: 400, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 16 }}>🔑</div>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color: "#050D1F", marginBottom: 8, textAlign: "center" }}>Forgot Password</h1>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#00C27A", fontSize: 14, marginBottom: 20 }}>✅ Reset link sent! Check your inbox.</div>
            <Link to="/login" style={{ color: "#1660F5", fontWeight: 700, textDecoration: "none" }}>← Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: "#5B6B8A", fontSize: 13, marginBottom: 20, textAlign: "center" }}>Enter your email to receive a reset link</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.in" required
              style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 14, marginBottom: 16, outline: "none", fontFamily: "DM Sans, sans-serif" }} />
            <button type="submit" disabled={loading}
              style={{ width: "100%", padding: "13px", background: "#1660F5", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <div style={{ textAlign: "center", marginTop: 16 }}><Link to="/login" style={{ color: "#5B6B8A", fontSize: 12, textDecoration: "none" }}>← Back to login</Link></div>
          </form>
        )}
      </div>
    </div>
  );
}