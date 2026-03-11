import { Router } from 'express';
import { getLoads, getMyLoads, createLoad, updateLoad, deleteLoad } from '../controllers/freight.controller.js';
import { protect, role } from '../middlewares/auth.middleware.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';

const router = Router();
router.use(protect, apiLimiter);

router.get('/',     getLoads);
router.get('/my',   getMyLoads);
router.post('/',    role('shipper','broker','admin'), createLoad);
router.put('/:id',  updateLoad);
router.delete('/:id', deleteLoad);

export default router;
