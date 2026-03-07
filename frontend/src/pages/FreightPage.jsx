/**
 * Freight Marketplace Page
 * Search loads, filters, bid placement
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { freightAPI } from "../services/api";

const TRUCK_TYPES = ["mini_truck", "tempo", "open_truck", "closed_truck", "container", "tanker", "trailer"];
const STATUS_BADGE = {
  open: "bg-emerald-100 text-emerald-700 border-emerald-200",
  bidding: "bg-blue-100 text-blue-700 border-blue-200",
  booked: "bg-purple-100 text-purple-700 border-purple-200",
  in_transit: "bg-orange-100 text-orange-700 border-orange-200",
};

export default function FreightPage() {
  const [filters, setFilters] = useState({
    originCity: "", destinationCity: "", truckType: "", page: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["loads", filters],
    queryFn: () => freightAPI.getLoads(filters).then(r => r.data),
    keepPreviousData: true,
  });

  const loads = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy" style={{ fontFamily: "'Syne', sans-serif" }}>
            Freight Marketplace
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{pagination?.total || 0} loads available</p>
        </div>
        <Link to="/freight/post"
          className="px-4 py-2 bg-brand text-white rounded-xl font-bold text-sm hover:bg-brand-dark transition-all">
          ＋ Post Load
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            placeholder="Origin city"
            value={filters.originCity}
            onChange={e => setFilters(f => ({ ...f, originCity: e.target.value, page: 1 }))}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand/50"
          />
          <input
            placeholder="Destination city"
            value={filters.destinationCity}
            onChange={e => setFilters(f => ({ ...f, destinationCity: e.target.value, page: 1 }))}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand/50"
          />
          <select
            value={filters.truckType}
            onChange={e => setFilters(f => ({ ...f, truckType: e.target.value, page: 1 }))}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand/50"
          >
            <option value="">All Truck Types</option>
            {TRUCK_TYPES.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
          <button
            onClick={() => setFilters({ originCity: "", destinationCity: "", truckType: "", page: 1 })}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-500 hover:text-navy hover:border-navy transition-all font-semibold"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Load cards */}
      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : loads.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-slate-500 font-semibold">No loads found</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {loads.map((load) => (
            <Link key={load._id} to={`/freight/${load._id}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-brand/40 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    📦
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-400">{load.loadNumber}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[load.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {load.status?.toUpperCase().replace("_", " ")}
                      </span>
                      {load.hazardous && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">⚠ Hazardous</span>}
                    </div>
                    <div className="font-bold text-navy text-base mt-0.5">{load.material}</div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                      <span className="font-semibold text-navy">{load.origin?.city}</span>
                      <span className="text-slate-300">→</span>
                      <span className="font-semibold text-navy">{load.destination?.city}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-black text-navy" style={{ fontFamily: "'Syne', sans-serif" }}>
                    ₹{(load.expectedPrice || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{load.weight}{load.weightUnit} · {load.truckType?.replace(/_/g, " ")}</div>
                  <div className="text-xs text-slate-400">{load.bids?.length || 0} bids</div>
                </div>
              </div>

              {load.postedBy && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>👤</span>
                    <span className="font-semibold">{load.postedBy.company || load.postedBy.name}</span>
                    {load.postedBy.rating > 0 && <span className="text-amber-500">⭐ {load.postedBy.rating.toFixed(1)}</span>}
                  </div>
                  <div className="text-xs text-slate-400">
                    Pickup: {new Date(load.pickupDate).toLocaleDateString("en-IN")}
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={filters.page <= 1}
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold disabled:opacity-40 hover:border-brand transition-all">
            ← Prev
          </button>
          <span className="text-sm text-slate-500">Page {filters.page} of {pagination.pages}</span>
          <button disabled={filters.page >= pagination.pages}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold disabled:opacity-40 hover:border-brand transition-all">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
