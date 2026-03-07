/**
 * TrackingPage — Live GPS tracking with Leaflet maps
 */
import { useState, useEffect, useRef } from "react";
import Layout from "../components/shared/Layout";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

export default function TrackingPage() {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [location, setLocation] = useState(null);
  const [socket, setSocket] = useState(null);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markerRef = useRef(null);

  const { data: bookings } = useQuery({
    queryKey: ["myBookings", "in_transit"],
    queryFn: () => api.get("/bookings?status=in_transit").then(r => r.data.data.bookings),
  });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const s = io(SOCKET_URL, { auth: { token } });
    setSocket(s);
    s.on("tracking:location", (data) => {
      setLocation(data);
      if (leafletMap.current && markerRef.current) {
        markerRef.current.setLatLng([data.lat, data.lng]);
        leafletMap.current.setView([data.lat, data.lng], 14);
      }
    });
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    // Load Leaflet dynamically
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const L = window.L;
      const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
      }).addTo(map);

      const truckIcon = L.divIcon({
        className: "",
        html: '<div style="font-size:28px;transform:translate(-50%,-50%)">🚛</div>',
        iconSize: [30, 30],
      });

      const marker = L.marker([20.5937, 78.9629], { icon: truckIcon }).addTo(map);
      leafletMap.current = map;
      markerRef.current = marker;
    };
    document.head.appendChild(script);
  }, [mapRef.current]);

  const joinTracking = (booking) => {
    setSelectedBooking(booking);
    if (socket) socket.emit("tracking:join", { bookingId: booking._id });
    const lat = booking.tracking?.currentLat || 20.5937;
    const lng = booking.tracking?.currentLng || 78.9629;
    setLocation({ lat, lng });
    if (leafletMap.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      leafletMap.current.setView([lat, lng], 12);
    }
  };

  const statusColor = { confirmed: "#1660F5", driver_assigned: "#7C3AED", pickup_started: "#FF5C00", in_transit: "#FF5C00", delivered: "#00C27A" };

  return (
    <Layout>
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, height: "calc(100vh - 120px)" }}>

        {/* Bookings panel */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0F4FF", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "20px 16px", borderBottom: "1px solid #F0F4FF" }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>📡 Live Tracking</h2>
            <p style={{ fontSize: 12, color: "#5B6B8A", marginTop: 4 }}>Active shipments</p>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {!bookings?.length && (
              <div style={{ textAlign: "center", padding: 32, color: "#9DB2CE", fontSize: 13 }}>No active shipments</div>
            )}
            {bookings?.map(b => (
              <div key={b._id} onClick={() => joinTracking(b)}
                style={{ padding: 14, borderRadius: 12, border: `2px solid ${selectedBooking?._id === b._id ? "#1660F5" : "#F0F4FF"}`, cursor: "pointer", marginBottom: 10, background: selectedBooking?._id === b._id ? "#F0F4FF" : "#FAFBFF", transition: "all 0.15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, background: statusColor[b.status] + "20", color: statusColor[b.status], padding: "2px 8px", borderRadius: 20 }}>{b.status?.replace("_"," ").toUpperCase()}</span>
                  <span style={{ fontSize: 11, color: "#9DB2CE" }}>#{b._id.slice(-6)}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#050D1F" }}>{b.load?.pickup?.city} → {b.load?.delivery?.city}</div>
                <div style={{ fontSize: 12, color: "#5B6B8A", marginTop: 4 }}>Driver: {b.driver?.name || "Unassigned"}</div>
                <div style={{ fontSize: 12, color: "#5B6B8A" }}>₹{b.agreedAmount?.toLocaleString("en-IN")}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F0F4FF", overflow: "hidden", position: "relative" }}>
          {selectedBooking && location && (
            <div style={{ position: "absolute", top: 16, left: 16, zIndex: 1000, background: "rgba(255,255,255,0.95)", borderRadius: 12, padding: "12px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", backdropFilter: "blur(10px)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#050D1F" }}>📍 Current Location</div>
              <div style={{ fontSize: 11, color: "#5B6B8A", marginTop: 4 }}>Lat: {location.lat?.toFixed(4)}, Lng: {location.lng?.toFixed(4)}</div>
              {location.speed && <div style={{ fontSize: 11, color: "#FF5C00", marginTop: 2 }}>⚡ {location.speed} km/h</div>}
            </div>
          )}
          <div ref={mapRef} style={{ width: "100%", height: "100%" }}>
            {!selectedBooking && (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: "#F8FAFF" }}>
                <div style={{ fontSize: 56 }}>🗺️</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#050D1F", fontFamily: "Syne, sans-serif" }}>Select a Shipment</div>
                <div style={{ fontSize: 13, color: "#5B6B8A" }}>Click a booking to track it live on the map</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
