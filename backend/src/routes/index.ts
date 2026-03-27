import { Router } from 'express';
import authRoutes from './auth';
import dashboardRoutes from './dashboard';
import loadRoutes from './loads';
import tripRoutes from './trips';
import paymentRoutes from './payments';
import settlementRoutes from './settlements';
import uploadRoutes from './uploads';
import healthRoutes from './health';

const router = Router();

router.use('/health', healthRoutes);

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/loads', loadRoutes);
router.use('/trips', tripRoutes);
router.use('/payments', paymentRoutes);
router.use('/settlements', settlementRoutes);
router.use('/uploads', uploadRoutes);

export default router;
