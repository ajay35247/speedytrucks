require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

// ── CORS ──────────────────────────────────────────
const allowedOrigins = [
  'https://www.aptrucking.in',
  'https://aptrucking.in',
  'https://speedytrucks.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// ── BODY PARSER ───────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── SOCKET.IO ─────────────────────────────────────
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
});
app.set('io', io);

// ── DATABASE ──────────────────────────────────────
connectDB();

// ── HEALTH CHECK ──────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', message: 'APTrucking API Running ✅' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: Math.floor(process.uptime()) + 's' }));

// ── ROUTES ────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));

// Load other routes only if they exist
const loadRoute = (path, route) => {
  try {
    app.use(path, require(route));
    console.log(`✅ Route loaded: ${path}`);
  } catch (e) {
    console.log(`⚠️ Route skipped (file missing): ${route}`);
  }
};

loadRoute('/api/loads', './routes/loadRoutes');
loadRoute('/api/trucks', './routes/truckRoutes');
loadRoute('/api/bookings', './routes/bookingRoutes');
loadRoute('/api/notifications', './routes/notificationRoutes');
loadRoute('/api/admin', './routes/adminRoutes');
loadRoute('/api/ads', './routes/adRoutes');
loadRoute('/api/referrals', './routes/referralRoutes');
loadRoute('/api/chat', './routes/chatRoutes');

// ── 404 ───────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} not found` }));

// ── ERROR HANDLER ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ── SOCKET EVENTS ─────────────────────────────────
io.on('connection', (socket) => {
  console.log('[Socket] Connected:', socket.id);
  socket.on('driver:location', (data) => socket.broadcast.emit('truck:location', data));
  socket.on('driver:status', (data) => socket.broadcast.emit('driver:status', data));
  socket.on('message:send', (data) => socket.broadcast.emit('message:new', data));
  socket.on('disconnect', () => console.log('[Socket] Disconnected:', socket.id));
});

// ── START ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚛 APTrucking Server started`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Env: ${process.env.NODE_ENV}`);
  console.log(`🔐 CORS: ${allowedOrigins.join(', ')}\n`);
});
