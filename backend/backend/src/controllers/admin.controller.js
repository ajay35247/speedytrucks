import User from '../models/User.model.js';
import KYC from '../models/KYC.model.js';
import FreightLoad from '../models/FreightLoad.model.js';
import AuditLog from '../models/AuditLog.model.js';
import WalletTransaction from '../models/WalletTransaction.model.js';
import { ok, err } from '../utils/response.js';
import { log } from '../services/audit.service.js';

export const getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalLoads, pendingKYC, txAgg] = await Promise.all([
      User.countDocuments(),
      FreightLoad.countDocuments(),
      KYC.countDocuments({ status: 'pending' }),
      WalletTransaction.aggregate([{ $match: { type: 'credit' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    return ok(res, { totalUsers, totalLoads, pendingKYC, totalRevenue: txAgg[0]?.total || 0 });
  } catch (e) { next(e); }
};

export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, role, status } = req.query;
    const filter = {};
    if (role)   filter.role = role;
    if (status) filter.status = status;
    const users = await User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    const total = await User.countDocuments(filter);
    return ok(res, { users, total });
  } catch (e) { next(e); }
};

export const suspendUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'suspended' }, { new: true });
    if (!user) return err(res, 'User not found', 404);
    await log(req.user._id, 'USER_SUSPENDED', { targetUser: req.params.id });
    return ok(res, { user }, 'User suspended');
  } catch (e) { next(e); }
};

export const reinstateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true });
    if (!user) return err(res, 'User not found', 404);
    await log(req.user._id, 'USER_REINSTATED', { targetUser: req.params.id });
    return ok(res, { user }, 'User reinstated');
  } catch (e) { next(e); }
};

export const getPendingKYC = async (req, res, next) => {
  try {
    const kycs = await KYC.find({ status: 'pending' }).populate('user', 'name email phone');
    return ok(res, { kycs });
  } catch (e) { next(e); }
};

export const approveKYC = async (req, res, next) => {
  try {
    const kyc = await KYC.findByIdAndUpdate(req.params.id, { status: 'approved', reviewedBy: req.user._id, reviewedAt: new Date() }, { new: true });
    if (!kyc) return err(res, 'KYC not found', 404);
    await User.findByIdAndUpdate(kyc.user, { kycStatus: 'approved' });
    await log(req.user._id, 'KYC_APPROVED', { kycId: req.params.id });
    return ok(res, { kyc }, 'KYC approved');
  } catch (e) { next(e); }
};

export const rejectKYC = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const kyc = await KYC.findByIdAndUpdate(req.params.id, { status: 'rejected', reviewedBy: req.user._id, reviewedAt: new Date(), remarks }, { new: true });
    if (!kyc) return err(res, 'KYC not found', 404);
    await User.findByIdAndUpdate(kyc.user, { kycStatus: 'rejected' });
    return ok(res, { kyc }, 'KYC rejected');
  } catch (e) { next(e); }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(100);
    return ok(res, { logs });
  } catch (e) { next(e); }
};
