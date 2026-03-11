import { Router } from 'express';
import { createOrder, verifyPayment, getWallet, withdrawWallet } from '../controllers/payment.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(protect);

router.post('/create-order', createOrder);
router.post('/verify',       verifyPayment);
router.get('/wallet',        getWallet);
router.post('/wallet/withdraw', withdrawWallet);

export default router;
