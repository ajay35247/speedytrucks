require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

// ── ALLOWED ORIGINS ───────────────────────────────
const allowedOrigins = [
  'https://www.aptrucking.in',
  'https://aptrucking.in',
  'https://speedytrucks.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

// ── CORS ──────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow mobile apps and Postman (no origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.log('[CORS Blocked]', origin);
    return callback(new Error('CORS: Origin not allowed - ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.options('*', cors());

// ── BODY PARSER ───────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── SOCKET.IO ─────────────────────────────────────
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'],
});
app.set('io', io);

// ── DATABASE ──────────────────────────────────────
connectDB();

// ── HEALTH CHECK ──────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '🚛 APTrucking API Running',
    version: '2.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()) + 's', env: process.env.NODE_ENV });
});

// ── ROUTES ────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));

// Optional routes - load only if file exists
const loadRoute = (path, file) => {
  try {
    app.use(path, require(file));
    console.log(`✅ Route: ${path}`);
  } catch {
    console.log(`⚠️ Skipped (missing): ${file}`);
  }
};

loadRoute('/api/loads',         './routes/loadRoutes');
loadRoute('/api/trucks',        './routes/truckRoutes');
loadRoute('/api/bookings',      './routes/bookingRoutes');
loadRoute('/api/notifications', './routes/notificationRoutes');
loadRoute('/api/admin',         './routes/adminRoutes');
loadRoute('/api/ads',           './routes/adRoutes');
loadRoute('/api/referrals',     './routes/referralRoutes');
loadRoute('/api/chat',          './routes/chatRoutes');

// ── 404 ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// ── ERROR HANDLER ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  const status = err.message?.includes('CORS') ? 403 : (err.status || 500);
  res.status(status).json({ message: err.message || 'Internal Server Error' });
});

// ── SOCKET EVENTS ─────────────────────────────────
io.on('connection', (socket) => {
  console.log('[Socket] Connected:', socket.id);
  socket.on('driver:location', (data) => socket.broadcast.emit('truck:location', data));
  socket.on('driver:status',   (data) => socket.broadcast.emit('driver:status', data));
  socket.on('message:send',    (data) => socket.broadcast.emit('message:new', data));
  socket.on('disconnect', () => console.log('[Socket] Disconnected:', socket.id));
});

// ── START SERVER ──────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('\n====================================');
  console.log('🚛  APTrucking Backend v2.0');
  console.log(`📡  Port: ${PORT}`);
  console.log(`🌍  Env: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐  CORS origins: ${allowedOrigins.length}`);
  console.log('====================================\n');
});
