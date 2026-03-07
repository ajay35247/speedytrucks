/**
 * LoginForm — email+password login with OTP toggle and 2FA support
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const C = {
  navy:"#050D1F", blue:"#1660F5", cyan:"#06C8D4", orange:"#FF5C00",
  slate:"#5B6B8A", slateL:"#8B9CB8", bg:"#F2F5FC", card:"#FFFFFF",
  success:"#00C27A", danger:"#F03D3D",
};

const Field = ({ label, type, value, onChange, placeholder, icon, action }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.slate, marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        {icon && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>{icon}</span>}
        <input
          type={type === "password" && show ? "text" : type}
          value={value} onChange={onChange} placeholder={placeholder}
          style={{
            width: "100%", padding: `12px 12px 12px ${icon ? 40 : 14}px`,
            border: `1.5px solid #E2E8F0`, borderRadius: 10,
            fontSize: 14, fontFamily: "DM Sans, sans-serif", outline: "none",
            background: "#fff", color: C.navy, paddingRight: (type === "password" || action) ? 44 : 14,
            transition: "border 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = C.blue)}
          onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
        />
        {type === "password" && (
          <button type="button" onClick={() => setShow(!show)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.slate }}>
            {show ? "🙈" : "👁️"}
          </button>
        )}
      </div>
    </div>
  );
};

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("password"); // "password" | "otp"
  const [step, setStep] = useState(1); // for OTP: 1=phone, 2=otp
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ email: "", password: "", phone: "", otp: "" });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email: form.email, password: form.password });
      if (data.data.twoFactorRequired) {
        toast.success("OTP sent for 2FA verification");
        setMode("otp2fa");
        setStep(2);
      } else {
        login(data.data.user, data.data.accessToken);
        toast.success(`Welcome back, ${data.data.user.name.split(" ")[0]}!`);
        navigate(data.data.user.role === "admin" ? "/admin" : "/dashboard");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally { setLoading(false); }
  };

  const handleOTPRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.requestOTP({ phone: form.phone });
      toast.success("OTP sent to your phone");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally { setLoading(false); }
  };

  const handleOTPVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.verifyOTP({ phone: form.phone, otp: form.otp });
      login(data.data.user, data.data.accessToken);
      toast.success("Login successful!");
      navigate(data.data.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "OTP verification failed");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg,${C.navy},#112248)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp 0.5s ease" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#1660F5,#06C8D4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 32 }}>🚛</div>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, fontFamily: "Syne, sans-serif", marginBottom: 4 }}>SpeedyTrucks</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>India's #1 Freight Marketplace</p>
        </div>

        {/* Card */}
        <div style={{ background: C.card, borderRadius: 20, padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.navy, fontFamily: "Syne, sans-serif", marginBottom: 4 }}>Sign In</h2>
          <p style={{ fontSize: 12, color: C.slate, marginBottom: 24 }}>Access your freight dashboard</p>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: "#F8FAFF", borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
            {[["password","🔑 Password"],["otp","📱 OTP"]].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setStep(1); }}
                style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "DM Sans, sans-serif", background: mode === m ? "#fff" : "transparent", color: mode === m ? C.navy : C.slateL, boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Password login form */}
          {mode === "password" && (
            <form onSubmit={handlePasswordLogin}>
              <Field label="Email Address" type="email" value={form.email} onChange={set("email")} placeholder="you@company.in" icon="✉️" />
              <Field label="Password" type="password" value={form.password} onChange={set("password")} placeholder="Your password" icon="🔒" />
              <div style={{ textAlign: "right", marginBottom: 20, marginTop: -10 }}>
                <Link to="/forgot-password" style={{ fontSize: 12, color: C.blue, textDecoration: "none", fontWeight: 600 }}>Forgot password?</Link>
              </div>
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "13px", background: loading ? "#A0B4FF" : `linear-gradient(135deg,${C.blue},#0040CC)`, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "DM Sans, sans-serif", transition: "all 0.2s" }}>
                {loading ? "Signing in..." : "Sign In →"}
              </button>
            </form>
          )}

          {/* OTP login form */}
          {mode === "otp" && (
            <form onSubmit={step === 1 ? handleOTPRequest : handleOTPVerify}>
              {step === 1 ? (
                <Field label="Phone Number" type="tel" value={form.phone} onChange={set("phone")} placeholder="+919876543210" icon="📱" />
              ) : (
                <>
                  <div style={{ background: "#F0FFF4", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#059669" }}>OTP sent to {form.phone} ✓</div>
                  <Field label="Enter 6-digit OTP" type="text" value={form.otp} onChange={set("otp")} placeholder="123456" icon="🔢" />
                  <button type="button" onClick={() => setStep(1)} style={{ background: "none", border: "none", color: C.blue, fontSize: 12, cursor: "pointer", fontWeight: 600, marginBottom: 16 }}>← Change number</button>
                </>
              )}
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "13px", background: loading ? "#A0B4FF" : `linear-gradient(135deg,${C.blue},#0040CC)`, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "DM Sans, sans-serif" }}>
                {loading ? "Please wait..." : step === 1 ? "Send OTP →" : "Verify OTP →"}
              </button>
            </form>
          )}

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: C.slate }}>
            No account? <Link to="/register" style={{ color: C.blue, fontWeight: 700, textDecoration: "none" }}>Register here</Link>
          </p>
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}