/**
 * HomePage - Public landing page showing all features
 * Features visible to all, but actions require login
 */
import { Link } from "react-router-dom";
import useAuthStore from "../context/authStore";

const FEATURES = [
  { icon: "🚛", title: "Load Marketplace", desc: "Post loads and find trucks instantly across India", link: "/freight" },
  { icon: "📍", title: "Live GPS Tracking", desc: "Track your shipment in real-time on the map", link: "/tracking" },
  { icon: "💳", title: "Secure Payments", desc: "Pay safely via Razorpay with wallet support", link: "/wallet" },
  { icon: "📋", title: "KYC Verification", desc: "Verified shippers and truck owners only", link: "/kyc" },
  { icon: "💬", title: "Live Chat", desc: "Chat directly with truck owners and shippers", link: "/chat" },
  { icon: "🤝", title: "Bid System", desc: "Get best rates through competitive bidding", link: "/freight" },
  { icon: "📊", title: "Analytics Dashboard", desc: "Track your business performance", link: "/dashboard" },
  { icon: "🔔", title: "Smart Notifications", desc: "Never miss a load or booking update", link: "/notifications" },
];

const STATS = [
  { value: "10,000+", label: "Truck Owners" },
  { value: "50,000+", label: "Loads Posted" },
  { value: "500+", label: "Cities Covered" },
  { value: "₹100Cr+", label: "Freight Moved" },
];

export default function HomePage() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚛</span>
            <span className="text-xl font-black text-[#050D1F]" style={{ fontFamily: "'Syne', sans-serif" }}>
              APTrucking
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard"
                className="bg-[#1660F5] text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all">
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 font-semibold text-sm hover:text-blue-600 transition-all">
                  Sign In
                </Link>
                <Link to="/register"
                  className="bg-[#1660F5] text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all">
                  Get Started Free →
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#050D1F] to-[#0B1A35] text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold px-4 py-1.5 rounded-full mb-6">
            🇮🇳 India's #1 Freight Marketplace
          </div>
          <h1 className="text-4xl sm:text-6xl font-black mb-6 leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
            Move Freight Smarter<br />
            <span className="text-[#FF7A00]">Across India</span>
          </h1>
          <p className="text-slate-300 text-lg sm:text-xl max-w-2xl mx-auto mb-10">
            Connect shippers with verified truck owners. Post loads, get bids, track shipments live — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={user ? "/freight" : "/register"}
              className="bg-[#FF7A00] text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30">
              {user ? "Browse Loads →" : "Start Posting Loads →"}
            </Link>
            <Link to={user ? "/dashboard" : "/login"}
              className="bg-white/10 border border-white/20 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all">
              {user ? "My Dashboard" : "Find Trucks →"}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#1660F5] py-10 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-white text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <div className="text-3xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>{value}</div>
              <div className="text-blue-200 text-sm font-medium mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-[#F2F5FC]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-[#050D1F] mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
              Everything You Need
            </h2>
            <p className="text-slate-500 text-lg">Powerful features for shippers, truck owners and brokers</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon, title, desc, link }) => (
              <Link key={title} to={user ? link : "/login"}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all group">
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="font-bold text-[#050D1F] mb-2 group-hover:text-[#1660F5] transition-colors">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                {!user && (
                  <div className="mt-3 text-xs text-blue-500 font-semibold">Login to access →</div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-[#050D1F] mb-4" style={{ fontFamily: "'Syne', sans-serif" }}>
              How It Works
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Register & Verify", desc: "Create your account and complete KYC verification in minutes" },
              { step: "02", title: "Post or Browse", desc: "Post your load or browse available trucks across India" },
              { step: "03", title: "Connect & Move", desc: "Get bids, accept the best offer, and track your shipment live" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-16 h-16 bg-[#1660F5] rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-5" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {step}
                </div>
                <h3 className="font-bold text-[#050D1F] text-lg mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#050D1F] to-[#0B1A35] py-20 px-4 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-black mb-6" style={{ fontFamily: "'Syne', sans-serif" }}>
            Ready to Get Started?
          </h2>
          <p className="text-slate-300 text-lg mb-10">Join thousands of shippers and truck owners on APTrucking</p>
          <Link to={user ? "/dashboard" : "/register"}
            className="bg-[#FF7A00] text-white px-10 py-4 rounded-2xl font-bold text-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30 inline-block">
            {user ? "Go to Dashboard →" : "Create Free Account →"}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050D1F] text-slate-400 py-10 px-4 text-center text-sm">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl">🚛</span>
            <span className="text-white font-black text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>APTrucking</span>
          </div>
          <p>India's #1 Freight Marketplace — Connecting Shippers & Truck Owners</p>
          <p className="mt-2">© 2024 APTrucking. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
