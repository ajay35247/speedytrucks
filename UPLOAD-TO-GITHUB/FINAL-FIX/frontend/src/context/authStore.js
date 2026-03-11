import { create } from "zustand";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "https://speedytrucks-production.up.railway.app/api";

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem("token") || null,
  user: (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })(),
  loading: false,
  error: null,

  // ✅ LOGIN with email + password
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password }, { timeout: 10000 });
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      set({ token, user, loading: false, error: null });
      return user;
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Check your email/password.";
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  // ✅ REGISTER
  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API}/auth/register`, data, { timeout: 10000 });
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      set({ token, user, loading: false, error: null });
      return user;
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed. Try again.";
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  // ✅ SEND OTP
  sendOTP: async (phone) => {
    const res = await axios.post(`${API}/auth/send-otp`, { phone }, { timeout: 10000 });
    return res.data;
  },

  // ✅ VERIFY OTP
  verifyOTP: async (phone, otp) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API}/auth/verify-otp`, { phone, otp }, { timeout: 10000 });
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      set({ token, user, loading: false, error: null });
      return user;
    } catch (err) {
      const msg = err.response?.data?.message || "OTP verification failed.";
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  // ✅ LOGOUT - fully clears everything
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    delete axios.defaults.headers.common["Authorization"];
    set({ token: null, user: null, loading: false, error: null });
    window.location.href = "/login";
  },

  clearError: () => set({ error: null }),
}));

// Set axios auth header on app load if token exists
const token = localStorage.getItem("token");
if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
