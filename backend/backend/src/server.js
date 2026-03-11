import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';

import { connectDB } from './config/db.js';
import logger from './utils/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiter.js';

import authRoutes    from './routes/auth.routes.js';
import freightRoutes from './routes/freight.routes.js';
import bidRoutes     from './routes/bid.routes.js';
import kycRoutes     from './routes/kyc.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes   from './routes/admin.routes.js';

const app = express();

// ── Security ──────────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://www.aptrucking.in',
  'https://aptrucking.in',
  'https://speedytrucks.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── Body Parsers ───────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Rate Limit ─────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Routes ─────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/freight',  freightRoutes);
app.use('/api/bids',     bidRoutes);
app.use('/api/kyc',      kycRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin',    adminRoutes);

// ── Health ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV, ts: new Date() }));
app.get('/', (req, res) => res.json({ name: 'APTrucking API', version: '2.0.0' }));

// ── 404 ────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` }));

// ── Error Handler ──────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
});
