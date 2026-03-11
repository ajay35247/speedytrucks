import { verifyAccess } from '../utils/jwt.js';
import User from '../models/User.model.js';
import { err } from '../utils/response.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return err(res, 'Not authenticated', 401);
    const decoded = verifyAccess(token);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return err(res, 'User not found', 401);
    if (user.status === 'suspended') return err(res, 'Account suspended', 403);
    req.user = user;
    next();
  } catch {
    return err(res, 'Invalid or expired token', 401);
  }
};

export const role = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return err(res, 'Access denied', 403);
  next();
};
