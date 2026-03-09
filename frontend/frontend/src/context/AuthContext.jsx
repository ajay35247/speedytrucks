import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://speedytrucks-production.up.railway.app/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true); // loading = checking if already logged in

  // On app start: check if token is still valid
  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem('token');
      if (!savedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API}/auth/profile`, {
          headers: { Authorization: `Bearer ${savedToken}` },
          timeout: 8000,
        });
        setUser(res.data.user);
        setToken(savedToken);
      } catch (err) {
        // Token expired or invalid - clear it
        console.log('[Auth] Token invalid, clearing...');
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
        // Always hide the loading spinner
        if (window.__hideLoader) window.__hideLoader();
      }
    };
    init();
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const register = async (data) => {
    const res = await axios.post(`${API}/auth/register`, data);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const sendOTP = async (phone) => {
    const res = await axios.post(`${API}/auth/send-otp`, { phone });
    return res.data;
  };

  const verifyOTP = async (phone, otp) => {
    const res = await axios.post(`${API}/auth/verify-otp`, { phone, otp });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  // ✅ LOGOUT - clears everything
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    // Redirect to login
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const savedToken = localStorage.getItem('token');
      const res = await axios.get(`${API}/auth/profile`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      setUser(res.data.user);
    } catch (err) {
      console.error('[RefreshUser]', err.message);
    }
  };

  // Axios default headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, sendOTP, verifyOTP, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
