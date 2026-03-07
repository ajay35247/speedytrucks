/**
 * Post Load Page – Freight posting form
 */
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { freightAPI } from "../services/api";

const TRUCK_TYPES = ["mini_truck", "tempo", "open_truck", "closed_truck", "container", "tanker", "trailer"];

const F = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const Input = ({ className = "", ...props }) => (
  <input {...props} className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand/50 ${className}`} />
);

export default function PostLoadPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const post = useMutation({
    mutationFn: (data) => freightAPI.postLoad({
      ...data,
      origin: { address: data.originAddress, city: data.originCity },
      destination: { address: data.destinationAddress, city: data.destinationCity },
    }),
    onSuccess: (res) => {
      toast.success(`Load ${res.data.data.loadNumber} posted!`);
      navigate("/freight");
    },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-navy" style={{ fontFamily: "'Syne', sans-serif" }}>Post a Load</h1>
        <p className="text-slate-500 text-sm mt-1">Fill in the details to find the right truck</p>
      </div>

      <form onSubmit={handleSubmit(d => post.mutate(d))} className="space-y-5">
        {/* Cargo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-bold text-navy">📦 Cargo Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Material / Goods" error={errors.material?.message}>
              <Input {...register("material", { required: "Required" })} placeholder="e.g. Steel Rods" />
            </F>
            <F label="Truck Type" error={errors.truckType?.message}>
              <select {...register("truckType", { required: "Required" })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand/50">
                <option value="">Select type</option>
                {TRUCK_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </F>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <F label="Weight">
              <Input {...register("weight", { valueAsNumber: true })} type="number" placeholder="1000" />
            </F>
            <F label="Unit">
              <select {...register("weightUnit")} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm">
                <option value="kg">kg</option>
                <option value="tons">tons</option>
              </select>
            </F>
            <F label="Budget (₹)">
              <Input {...register("expectedPrice", { valueAsNumber: true })} type="number" placeholder="50000" />
            </F>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
              <input type="checkbox" {...register("hazardous")} className="rounded" />
              Hazardous goods
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
              <input type="checkbox" {...register("refrigerated")} className="rounded" />
              Refrigerated
            </label>
          </div>
        </div>

        {/* Route */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-bold text-navy">🗺️ Route</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Origin City" error={errors.originCity?.message}>
              <Input {...register("originCity", { required: "Required" })} placeholder="Mumbai" />
            </F>
            <F label="Origin Address">
              <Input {...register("originAddress")} placeholder="Full address" />
            </F>
            <F label="Destination City" error={errors.destinationCity?.message}>
              <Input {...register("destinationCity", { required: "Required" })} placeholder="Delhi" />
            </F>
            <F label="Destination Address">
              <Input {...register("destinationAddress")} placeholder="Full address" />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Pickup Date" error={errors.pickupDate?.message}>
              <Input {...register("pickupDate", { required: "Required" })} type="date" />
            </F>
            <F label="Expected Delivery">
              <Input {...register("deliveryDate")} type="date" />
            </F>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <F label="Special Instructions">
            <textarea {...register("specialInstructions")} rows={3} placeholder="Any special requirements..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand/50 resize-none" />
          </F>
        </div>

        <button type="submit" disabled={post.isPending}
          className="w-full py-3.5 bg-gradient-to-r from-brand to-brand-dark text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-brand/30 transition-all disabled:opacity-50">
          {post.isPending ? "Posting..." : "Post Load →"}
        </button>
      </form>
    </div>
  );
}
