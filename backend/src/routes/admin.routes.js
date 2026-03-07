/**
 * Admin Routes — protected, admin only
 */
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/admin.controller");
const { protect, authorize } = require("../middlewares/auth.middleware");
const kycCtrl = require("../controllers/kyc.controller");

router.use(protect, authorize("admin"));

router.get("/users",                    ctrl.getUsers);
router.patch("/users/:id/suspend",      ctrl.suspendUser);
router.patch("/users/:id/reinstate",    ctrl.reinstateUser);
router.patch("/users/:id/reset-password", ctrl.adminResetPassword);
router.get("/kyc/pending",              kycCtrl.getPendingKYCs);
router.patch("/kyc/:id/approve",        ctrl.approveKYC);
router.patch("/kyc/:id/reject",         ctrl.rejectKYC);
router.get("/audit-logs",               ctrl.getAuditLogs);
router.get("/stats",                    ctrl.getStats);

module.exports = router;