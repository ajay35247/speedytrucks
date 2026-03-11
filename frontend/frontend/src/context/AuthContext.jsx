import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      const t = localStorage.getItem('token');
      if (!t) { setLoading(false); return; }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null); setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const _save = (tkn, usr) => {
    localStorage.setItem('token', tkn);
    localStorage.setItem('user', JSON.stringify(usr));
    setToken(tkn); setUser(usr);
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    _save(res.data.token, res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    _save(res.data.token, res.data.user);
    return res.data.user;
  };

  const sendOTP = async (phone) => {
    const res = await api.post('/auth/otp/request', { phone });
    return res.data;
  };

  const verifyOTP = async (phone, otp) => {
    const res = await api.post('/auth/otp/verify', { phone, otp });
    _save(res.data.token, res.data.user);
    return res.data.user;
  };

  const forgotPassword = async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  };

  const resetPassword = async (token, password) => {
    const res = await api.post('/auth/reset-password', { token, password });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null); setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, sendOTP, verifyOTP, forgotPassword, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
