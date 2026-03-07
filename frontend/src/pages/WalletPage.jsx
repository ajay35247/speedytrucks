// ── WalletPage.jsx ─────────────────────────────────────────────
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { paymentAPI } from "../services/api";

export default function WalletPage() {
  const [showPayout, setShowPayout] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const { data, refetch } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => paymentAPI.getWallet().then(r => r.data.data),
  });

  const payout = useMutation({
    mutationFn: (d) => paymentAPI.requestPayout(d),
    onSuccess: () => { toast.success("Payout requested!"); setShowPayout(false); reset(); refetch(); },
  });

  const wallet = data || {};
  const txns = data?.transactions || [];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-black text-navy" style={{ fontFamily: "'Syne', sans-serif" }}>Wallet</h1>

      <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #050D1F, #1660F5)" }}>
        <div className="text-slate-400 text-sm mb-1">Available Balance</div>
        <div className="text-4xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>
          ₹{(wallet.balance || 0).toLocaleString("en-IN")}
        </div>
        {wallet.upiId && <div className="text-slate-400 text-sm mt-2">UPI: {wallet.upiId}</div>}
        <button onClick={() => setShowPayout(!showPayout)}
          className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/20 text-white rounded-xl text-sm font-bold transition-all">
          Request Payout
        </button>
      </div>

      {showPayout && (
        <form onSubmit={handleSubmit(d => payout.mutate(d))} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="font-bold text-navy">Request Payout</h3>
          <input {...register("upiId", { required: true })} placeholder="UPI ID (e.g. name@upi)"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand/50" />
          <input {...register("amount", { required: true, min: 100, valueAsNumber: true })}
            type="number" placeholder="Amount (min ₹100)"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand/50" />
          <button type="submit" disabled={payout.isPending}
            className="w-full py-2.5 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brand-dark disabled:opacity-50">
            {payout.isPending ? "Processing..." : "Submit Payout"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-navy mb-4">Transaction History</h3>
        {txns.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No transactions yet</p>
        ) : txns.map(txn => (
          <div key={txn._id} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${
              txn.type === "credit" ? "bg-emerald-100" : "bg-red-50"
            }`}>
              {txn.type === "credit" ? "↑" : "↓"}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-navy text-sm">{txn.description}</div>
              <div className="text-xs text-slate-400">{new Date(txn.createdAt).toLocaleDateString()}</div>
            </div>
            <div className={`font-bold text-sm ${txn.type === "credit" ? "text-emerald-600" : "text-red-500"}`}>
              {txn.type === "credit" ? "+" : "−"}₹{txn.amount.toLocaleString("en-IN")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
