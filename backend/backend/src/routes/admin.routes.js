import { Router } from 'express';
import { getStats, getUsers, suspendUser, reinstateUser, getPendingKYC, approveKYC, rejectKYC, getAuditLogs } from '../controllers/admin.controller.js';
import { protect, role } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(protect, role('admin'));

router.get('/stats',              getStats);
router.get('/users',              getUsers);
router.patch('/users/:id/suspend',   suspendUser);
router.patch('/users/:id/reinstate', reinstateUser);
router.get('/kyc/pending',        getPendingKYC);
router.patch('/kyc/:id/approve',  approveKYC);
router.patch('/kyc/:id/reject',   rejectKYC);
router.get('/audit-logs',         getAuditLogs);

export default router;
