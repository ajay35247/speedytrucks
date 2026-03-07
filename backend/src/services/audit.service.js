/**
 * Audit Service — logs all critical actions to MongoDB AuditLog
 */
const AuditLog = require("../models/AuditLog.model");
const logger = require("../utils/logger");

const log = async ({ userId, action, resource, resourceId, ip, userAgent, status = "success", detail, metadata }) => {
  try {
    await AuditLog.create({ user: userId, action, resource, resourceId, ip, userAgent, status, detail, metadata });
  } catch (err) {
    logger.error(`Audit log failed: ${err.message}`);
  }
};

module.exports = { log };