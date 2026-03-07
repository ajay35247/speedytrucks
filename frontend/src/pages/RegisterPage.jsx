import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const C = { navy:"#050D1F", blue:"#1660F5", slate:"#5B6B8A", slateL:"#8B9CB8", card:"#FFFFFF" };

const Field = ({ label, type = "text", value, onChange, placeholder }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.slate, marginBottom: 5 }}>{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, fontFamily: "DM Sans, sans-serif", outline: "none", background: "#fff", color: C.navy }}
      onFocus={(e) => (e.target.style.borderColor = C.blue)}
      onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")} />
  </div>
);

const ROLES = [
  { value: "shipper", label: "Shipper", desc: "Post loads & ship goods", icon: "📦" },
  { value: "owner", label: "Truck Owner", desc: "Register trucks & earn", icon: "🚛" },
  { value: "broker", label: "Broker", desc: "Facilitate freight deals", icon: "🤝" },
];

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", company: "", role: "", otp: "" });
  const [userId, setUserId] = useState(null);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.register({ name: form.name, email: form.email, phone: form.phone, password: form.password, company: form.company, role: form.role });
      setUserId(data.data.userId);
      toast.success("OTP sent to your phone!");
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.verifyPhone({ phone: form.phone, otp: form.otp });
      login(data.data.user, data.data.accessToken);
      toast.success("Account verified! Welcome to SpeedyTrucks!");
      navigate("/kyc");
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#050D1F,#112248)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 460, animation: "fadeUp 0.5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg,#1660F5,#06C8D4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 28 }}>🚛</div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 900, fontFamily: "Syne, sans-serif" }}>SpeedyTrucks</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Create your free account</p>
        </div>

        <div style={{ background: C.card, borderRadius: 20, padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 8, marginBottom: 28, justifyContent: "center" }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ width: step >= s ? 32 : 8, height: 8, borderRadius: 4, background: step >= s ? C.blue : "#E2E8F0", transition: "all 0.3s" }} />
            ))}
          </div>

          {/* Step 1: Choose role */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.navy, fontFamily: "Syne, sans-serif", marginBottom: 4 }}>Choose your role</h2>
              <p style={{ fontSize: 12, color: C.slate, marginBottom: 20 }}>Select how you will use SpeedyTrucks</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ROLES.map((r) => (
                  <button key={r.value} onClick={() => { setForm(p => ({ ...p, role: r.value })); setStep(2); }}
                    style={{ padding: "16px 20px", border: `2px solid ${form.role === r.value ? C.blue : "#E2E8F0"}`, borderRadius: 12, background: form.role === r.value ? "#EEF4FF" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
                    <span style={{ fontSize: 28 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: C.slateL }}>{r.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: C.slate }}>
                Have an account? <Link to="/login" style={{ color: C.blue, fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
              </p>
            </div>
          )}

          {/* Step 2: Fill details */}
          {step === 2 && (
            <form onSubmit={handleRegister}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.navy, fontFamily: "Syne, sans-serif", marginBottom: 4 }}>Create Account</h2>
              <div style={{ display: "inline-block", background: "#EEF4FF", color: C.blue, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, marginBottom: 20 }}>{ROLES.find(r=>r.value===form.role)?.icon} {form.role?.toUpperCase()}</div>
              <Field label="Full Name" value={form.name} onChange={set("name")} placeholder="Rajesh Kumar" />
              <Field label="Email Address" type="email" value={form.email} onChange={set("email")} placeholder="you@company.in" />
              <Field label="Phone (+91)" type="tel" value={form.phone} onChange={set("phone")} placeholder="+919876543210" />
              <Field label="Password (min 8 chars)" type="password" value={form.password} onChange={set("password")} placeholder="Strong password" />
              <Field label="Company / Business Name" value={form.company} onChange={set("company")} placeholder="Your Company Pvt Ltd" />
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setStep(1)} style={{ flex: 1, padding: "12px", border: "1.5px solid #E2E8F0", borderRadius: 12, background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.slate }}>← Back</button>
                <button type="submit" disabled={loading} style={{ flex: 2, padding: "12px", background: C.blue, border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "Creating..." : "Create Account →"}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Verify OTP */}
          {step === 3 && (
            <form onSubmit={handleVerify}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.navy, fontFamily: "Syne, sans-serif", marginBottom: 4 }}>Verify Phone</h2>
              <p style={{ fontSize: 12, color: C.slate, marginBottom: 20 }}>We sent a 6-digit OTP to <strong>{form.phone}</strong></p>
              <Field label="Enter OTP" value={form.otp} onChange={set("otp")} placeholder="123456" />
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "13px", background: "#00C27A", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {loading ? "Verifying..." : "Verify & Continue →"}
              </button>
            </form>
          )}
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}