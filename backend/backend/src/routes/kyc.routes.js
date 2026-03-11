import { Router } from 'express';
import multer from 'multer';
import { getStatus, uploadDocument } from '../controllers/kyc.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const storage = multer.diskStorage({
  destination: '/tmp/uploads/',
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();
router.use(protect);

router.get('/status',             getStatus);
router.post('/upload/:docType',   upload.single('document'), uploadDocument);

export default router;
