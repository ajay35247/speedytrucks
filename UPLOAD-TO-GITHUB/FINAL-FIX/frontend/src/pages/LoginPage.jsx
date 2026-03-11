import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../context/authStore";

export default function LoginPage() {
  const { login, sendOTP, verifyOTP, loading } = useAuthStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState("email"); // "email" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");
    if (!phone || phone.length < 10) { setError("Enter a valid 10-digit phone number"); return; }
    try {
      await sendOTP(phone);
      setOtpSent(true);
    } catch (err) {
      setError(err.message || "Failed to send OTP. Try again.");
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await verifyOTP(phone, otp);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logo}>🚛</div>
        <h1 style={s.title}>APTrucking</h1>
        <p style={s.sub}>India's #1 Freight Marketplace</p>

        {/* Tabs */}
        <div style={s.tabs}>
          <button style={{ ...s.tab, ...(tab === "email" ? s.tabActive : {}) }} onClick={() => { setTab("email"); setError(""); }}>
            📧 Email Login
          </button>
          <button style={{ ...s.tab, ...(tab === "otp" ? s.tabActive : {}) }} onClick={() => { setTab("otp"); setError(""); }}>
            📱 Mobile OTP
          </button>
        </div>

        {/* Error */}
        {error && <div style={s.error}>⚠️ {error}</div>}

        {/* Email Login Form */}
        {tab === "email" && (
          <form onSubmit={handleEmailLogin} style={s.form}>
            <label style={s.label}>Email Address</label>
            <input style={s.input} type="email" placeholder="ajay@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />

            <label style={s.label}>Password</label>
            <div style={s.passRow}>
              <input style={{ ...s.input, flex: 1, marginBottom: 0 }}
                type={showPass ? "text" : "password"} placeholder="Enter password"
                value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              <button type="button" style={s.eyeBtn} onClick={() => setShowPass(p => !p)}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>

            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>
        )}

        {/* OTP Login Form */}
        {tab === "otp" && (
          <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} style={s.form}>
            <label style={s.label}>Mobile Number</label>
            <div style={s.passRow}>
              <span style={s.prefix}>+91</span>
              <input style={{ ...s.input, flex: 1, marginBottom: 0, borderRadius: "0 10px 10px 0" }}
                type="tel" placeholder="9876543210" maxLength={10}
                value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                disabled={otpSent} required />
            </div>

            {otpSent && (
              <>
                <label style={s.label}>Enter OTP</label>
                <input style={{ ...s.input, letterSpacing: "8px", fontSize: "22px", textAlign: "center" }}
                  type="tel" placeholder="------" maxLength={6}
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} required />
                <button type="button" style={s.resend} onClick={() => { setOtpSent(false); setOtp(""); }}>
                  ← Change number / Resend OTP
                </button>
              </>
            )}

            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
              {loading ? "Please wait..." : otpSent ? "Verify OTP →" : "Send OTP →"}
            </button>
          </form>
        )}

        <p style={s.footer}>
          Don't have an account?{" "}
          <Link to="/register" style={s.link}>Register Free</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#050D1F", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  card: { background: "#0B1A35", borderRadius: "20px", padding: "40px 32px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
  logo: { fontSize: "56px", textAlign: "center" },
  title: { color: "#fff", fontSize: "28px", fontWeight: "bold", textAlign: "center", margin: "8px 0 4px" },
  sub: { color: "#888", fontSize: "14px", textAlign: "center", marginBottom: "28px" },
  tabs: { display: "flex", gap: "8px", marginBottom: "20px" },
  tab: { flex: 1, padding: "10px", borderRadius: "10px", border: "2px solid #1a3060", background: "transparent", color: "#888", cursor: "pointer", fontSize: "13px", fontWeight: "600" },
  tabActive: { borderColor: "#1660F5", background: "#1660F520", color: "#fff" },
  error: { background: "#ff3b3020", border: "1px solid #ff3b30", borderRadius: "10px", padding: "12px", color: "#ff6b6b", fontSize: "14px", marginBottom: "16px" },
  form: { display: "flex", flexDirection: "column" },
  label: { color: "#aaa", fontSize: "13px", marginBottom: "6px", marginTop: "14px" },
  input: { background: "#112040", border: "1px solid #1a3060", borderRadius: "10px", padding: "14px", color: "#fff", fontSize: "15px", marginBottom: "4px", outline: "none", width: "100%", boxSizing: "border-box" },
  passRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" },
  eyeBtn: { background: "#112040", border: "1px solid #1a3060", borderRadius: "10px", padding: "13px", cursor: "pointer", fontSize: "18px" },
  prefix: { background: "#1a3060", borderRadius: "10px 0 0 10px", padding: "14px 12px", color: "#fff", fontWeight: "bold", fontSize: "14px" },
  btn: { background: "#1660F5", color: "#fff", border: "none", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "24px" },
  resend: { background: "none", border: "none", color: "#1660F5", cursor: "pointer", fontSize: "13px", marginTop: "8px", textAlign: "left" },
  footer: { color: "#888", fontSize: "14px", textAlign: "center", marginTop: "24px" },
  link: { color: "#1660F5", fontWeight: "bold" },
};
