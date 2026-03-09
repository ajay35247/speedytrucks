/**
 * Auth Store (Zustand) - Fixed logout + security improvements
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

      setUser: (user) => set({ user }),
      setAccessToken: (token) => {
        if (token) localStorage.setItem("accessToken", token);
        else localStorage.removeItem("accessToken");
        set({ accessToken: token });
      },

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.login(credentials);
          if (data.requiresTwoFactor) {
            set({ isLoading: false });
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
        localStorage.removeItem("st-auth");
        sessionStorage.clear();
        set({ user: null, accessToken: null, isInitialized: false });
        // Force redirect to login
        window.location.href = "/login";
      },

      refreshUser: async () => {
        try {
          const { data } = await authAPI.getMe();
          set({ user: data.data, isInitialized: true });
        } catch {
          set({ user: null, accessToken: null, isInitialized: true });
          localStorage.removeItem("accessToken");
          localStorage.removeItem("st-auth");
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
