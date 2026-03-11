import { Router } from 'express';
import { placeBid, getBidsForLoad, acceptBid, withdrawBid } from '../controllers/bid.controller.js';
import { protect, role } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(protect);

router.post('/',              role('transporter','broker'), placeBid);
router.get('/load/:id',       getBidsForLoad);
router.patch('/:id/accept',   role('shipper','broker','admin'), acceptBid);
router.patch('/:id/withdraw', withdrawBid);

export default router;
