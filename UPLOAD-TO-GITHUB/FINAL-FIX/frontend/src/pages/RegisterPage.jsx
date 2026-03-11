import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../context/authStore";

const ROLES = [
  { id: "shipper", icon: "📦", label: "Shipper", desc: "Post loads & book trucks" },
  { id: "transporter", icon: "🚛", label: "Truck Owner", desc: "Find loads & earn money" },
];

export default function RegisterPage() {
  const { register, loading } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "shipper", company: "" });
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    try {
      await register({ ...form, phone: form.phone ? `+91${form.phone}` : "" });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>🚛</div>
        <h1 style={s.title}>Create Account</h1>
        <p style={s.sub}>Join India's #1 Freight Platform</p>

        {/* Role Selection */}
        <div style={s.roles}>
          {ROLES.map(r => (
            <button key={r.id} type="button"
              style={{ ...s.roleBtn, ...(form.role === r.id ? s.roleBtnActive : {}) }}
              onClick={() => set("role", r.id)}>
              <span style={{ fontSize: "24px" }}>{r.icon}</span>
              <span style={s.roleLabel}>{r.label}</span>
              <span style={s.roleDesc}>{r.desc}</span>
            </button>
          ))}
        </div>

        {error && <div style={s.error}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Full Name *</label>
          <input style={s.input} placeholder="Ajay Kumar" value={form.name} onChange={e => set("name", e.target.value)} required />

          <label style={s.label}>Email *</label>
          <input style={s.input} type="email" placeholder="ajay@example.com" value={form.email} onChange={e => set("email", e.target.value)} required />

          <label style={s.label}>Mobile Number</label>
          <div style={{ display: "flex" }}>
            <span style={s.prefix}>+91</span>
            <input style={{ ...s.input, borderRadius: "0 10px 10px 0", marginBottom: 0 }}
              type="tel" placeholder="9876543210" maxLength={10}
              value={form.phone} onChange={e => set("phone", e.target.value.replace(/\D/g, ""))} />
          </div>

          <label style={{ ...s.label, marginTop: "14px" }}>Company Name</label>
          <input style={s.input} placeholder="Your company (optional)" value={form.company} onChange={e => set("company", e.target.value)} />

          <label style={s.label}>Password *</label>
          <input style={s.input} type="password" placeholder="Minimum 6 characters" value={form.password} onChange={e => set("password", e.target.value)} required />

          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account →"}
          </button>
        </form>

        <p style={s.footer}>
          Already have an account?{" "}
          <Link to="/login" style={s.link}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#050D1F", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  card: { background: "#0B1A35", borderRadius: "20px", padding: "40px 32px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
  logo: { fontSize: "48px", textAlign: "center" },
  title: { color: "#fff", fontSize: "26px", fontWeight: "bold", textAlign: "center", margin: "8px 0 4px" },
  sub: { color: "#888", fontSize: "14px", textAlign: "center", marginBottom: "24px" },
  roles: { display: "flex", gap: "10px", marginBottom: "20px" },
  roleBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "14px 10px", borderRadius: "12px", border: "2px solid #1a3060", background: "transparent", cursor: "pointer" },
  roleBtnActive: { borderColor: "#1660F5", background: "#1660F520" },
  roleLabel: { color: "#fff", fontWeight: "bold", fontSize: "13px" },
  roleDesc: { color: "#888", fontSize: "11px", textAlign: "center" },
  error: { background: "#ff3b3020", border: "1px solid #ff3b30", borderRadius: "10px", padding: "12px", color: "#ff6b6b", fontSize: "14px", marginBottom: "16px" },
  form: { display: "flex", flexDirection: "column" },
  label: { color: "#aaa", fontSize: "13px", marginBottom: "6px", marginTop: "12px" },
  input: { background: "#112040", border: "1px solid #1a3060", borderRadius: "10px", padding: "14px", color: "#fff", fontSize: "15px", marginBottom: "4px", outline: "none", width: "100%", boxSizing: "border-box" },
  prefix: { background: "#1a3060", borderRadius: "10px 0 0 10px", padding: "14px 12px", color: "#fff", fontWeight: "bold", fontSize: "14px" },
  btn: { background: "#1660F5", color: "#fff", border: "none", borderRadius: "12px", padding: "16px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "24px" },
  footer: { color: "#888", fontSize: "14px", textAlign: "center", marginTop: "24px" },
  link: { color: "#1660F5", fontWeight: "bold" },
};
