/**
 * Axios API client — centralized HTTP layer with auth interceptors
 */
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,          // send cookies automatically
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ── Request interceptor — attach access token ──────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — auto-refresh on 401 ────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await api.post("/auth/refresh");
        const newToken = data.data.accessToken;
        localStorage.setItem("accessToken", newToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth API ───────────────────────────────────────────────────
export const authAPI = {
  register:       (data) => api.post("/auth/register", data),
  verifyPhone:    (data) => api.post("/auth/verify-phone", data),
  login:          (data) => api.post("/auth/login", data),
  requestOTP:     (data) => api.post("/auth/otp/request", data),
  verifyOTP:      (data) => api.post("/auth/otp/verify", data),
  refresh:        ()     => api.post("/auth/refresh"),
  logout:         ()     => api.post("/auth/logout"),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword:  (data) => api.post("/auth/reset-password", data),
  getMe:          ()     => api.get("/auth/me"),
};

// ── Freight API ───────────────────────────────────────────────
export const freightAPI = {
  getLoads:   (params) => api.get("/freight", { params }),
  getLoad:    (id)     => api.get(`/freight/${id}`),
  postLoad:   (data)   => api.post("/freight", data),
  updateLoad: (id, d)  => api.put(`/freight/${id}`, d),
  cancelLoad: (id)     => api.delete(`/freight/${id}`),
  myLoads:    ()       => api.get("/freight/my"),
};

// ── Bid API ────────────────────────────────────────────────────
export const bidAPI = {
  placeBid:    (data) => api.post("/bids", data),
  getLoadBids: (id)   => api.get(`/bids/load/${id}`),
  acceptBid:   (id)   => api.patch(`/bids/${id}/accept`),
  withdrawBid: (id)   => api.patch(`/bids/${id}/withdraw`),
  myBids:      ()     => api.get("/bids/my"),
};

// ── KYC API ────────────────────────────────────────────────────
export const kycAPI = {
  getStatus:      ()           => api.get("/kyc/status"),
  uploadDocument: (docType, file) => {
    const form = new FormData();
    form.append("document", file);
    return api.post(`/kyc/upload/${docType}`, form, { headers: { "Content-Type": "multipart/form-data" } });
  },
};

// ── Truck API ──────────────────────────────────────────────────
export const truckAPI = {
  getTrucks:  (params) => api.get("/trucks", { params }),
  myFleet:    ()       => api.get("/trucks/my"),
  addTruck:   (data)   => api.post("/trucks", data),
};

// ── Payment API ────────────────────────────────────────────────
export const paymentAPI = {
  createOrder:  (data) => api.post("/payments/create-order", data),
  verifyPayment:(data) => api.post("/payments/verify", data),
  getWallet:    ()     => api.get("/payments/wallet"),
  withdraw:     (data) => api.post("/payments/wallet/withdraw", data),
};

// ── Admin API ──────────────────────────────────────────────────
export const adminAPI = {
  getUsers:       (params) => api.get("/admin/users", { params }),
  suspendUser:    (id, reason) => api.patch(`/admin/users/${id}/suspend`, { reason }),
  reinstateUser:  (id)     => api.patch(`/admin/users/${id}/reinstate`),
  getPendingKYC:  ()       => api.get("/admin/kyc/pending"),
  approveKYC:     (id)     => api.patch(`/admin/kyc/${id}/approve`),
  rejectKYC:      (id, r)  => api.patch(`/admin/kyc/${id}/reject`, { reason: r }),
  getAuditLogs:   (params) => api.get("/admin/audit-logs", { params }),
  getStats:       ()       => api.get("/admin/stats"),
};

export default api;
// ── Booking API ────────────────────────────────────────────────
export const bookingAPI = {
  getMyBookings: (params) => api.get("/bookings", { params }),
  getBooking:    (id)     => api.get(`/bookings/${id}`),
  updateStatus:  (id, d)  => api.patch(`/bookings/${id}/status`, d),
  verifyOTP:     (id, d)  => api.post(`/bookings/${id}/verify-otp`, d),
  submitReview:  (id, d)  => api.post(`/bookings/${id}/review`, d),
};

// ── Chat API ───────────────────────────────────────────────────
export const chatAPI = {
  getOrCreate:   (data)   => api.post("/chat/conversations", data),
  getConvs:      ()       => api.get("/chat/conversations"),
  getMessages:   (id)     => api.get(`/chat/conversations/${id}/messages`),
};

// ── Ads API ────────────────────────────────────────────────────
export const adsAPI = {
  getActive:     (params) => api.get("/ads/active", { params }),
  recordClick:   (id)     => api.post(`/ads/${id}/click`),
  createCampaign:(data)   => api.post("/ads", data),
  getMyCampaigns:()       => api.get("/ads/my"),
};

// ── Referral API ───────────────────────────────────────────────
export const referralAPI = {
  getMy:         ()       => api.get("/referrals/my"),
  apply:         (data)   => api.post("/referrals/apply", data),
  leaderboard:   ()       => api.get("/referrals/leaderboard"),
};

// ── Notification API ───────────────────────────────────────────
export const notificationAPI = {
  getAll:        (params) => api.get("/notifications", { params }),
  markRead:      (id)     => api.patch(`/notifications/${id}/read`),
  markAllRead:   ()       => api.patch("/notifications/read-all"),
};
