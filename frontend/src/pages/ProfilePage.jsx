// ── ProfilePage.jsx ────────────────────────────────────────────
import useAuthStore from "../context/authStore";
export default function ProfilePage() {
  const { user } = useAuthStore();
  return (
    <div className="max-w-xl mx-auto space-y-5">
      <h1 className="text-2xl font-black text-navy" style={{ fontFamily: "'Syne', sans-serif" }}>Profile</h1>
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-orange flex items-center justify-center text-2xl font-black text-white">
            {user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </div>
          <div>
            <div className="text-xl font-black text-navy">{user?.name}</div>
            <div className="text-sm text-slate-500">{user?.company}</div>
            <span className="text-xs font-bold bg-brand/10 text-brand px-2 py-0.5 rounded-full">
              {user?.role?.toUpperCase().replace("_", " ")}
            </span>
          </div>
        </div>
        {[
          ["Email", user?.email],
          ["Phone", user?.phone],
          ["Status", user?.status?.replace("_", " ")],
          ["Member Since", user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"],
          ["Last Login", user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between py-3 border-b border-slate-100 last:border-0 text-sm">
            <span className="text-slate-500 font-medium">{k}</span>
            <span className="font-semibold text-navy">{v || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
