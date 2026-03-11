import AuditLog from '../models/AuditLog.model.js';

export const log = async (userId, action, details = {}, ip = '') => {
  try {
    await AuditLog.create({ user: userId, action, details, ip });
  } catch {
    // Never fail because of audit logging
  }
};
