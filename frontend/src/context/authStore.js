/**
 * Auth Store (Zustand)
 * Global auth state: user, token, loading
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authAPI } from "../services/api";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isInitialized: false,

      // ── Actions ──────────────────────────────────────────
      setUser: (user) => set({ user }),
      setAccessToken: (token) => {
        localStorage.setItem("accessToken", token || "");
        set({ accessToken: token });
      },

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.login(credentials);
          if (data.requiresTwoFactor) {
            return { requiresTwoFactor: true, preAuthToken: data.preAuthToken };
          }
          localStorage.setItem("accessToken", data.accessToken);
          set({ user: data.user, accessToken: data.accessToken, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      loginWithOTP: async (phone, otp) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.verifyOTP({ phone, otp });
          localStorage.setItem("accessToken", data.accessToken);
          set({ user: data.user, accessToken: data.accessToken, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try { await authAPI.logout(); } catch {}
        localStorage.removeItem("accessToken");
        set({ user: null, accessToken: null });
      },

      refreshUser: async () => {
        try {
          const { data } = await authAPI.getMe();
          set({ user: data.data, isInitialized: true });
        } catch {
          set({ user: null, accessToken: null, isInitialized: true });
          localStorage.removeItem("accessToken");
        }
      },

      initialize: async () => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          set({ isInitialized: true });
          return;
        }
        await get().refreshUser();
      },
    }),
    {
      name: "st-auth",
      partialize: (state) => ({ accessToken: state.accessToken }),
    }
  )
);

export default useAuthStore;
