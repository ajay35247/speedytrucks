require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

// ✅ CORS - allow your website + local dev
const allowedOrigins = [
  'https://www.aptrucking.in',
  'https://aptrucking.in',
  'https://speedytrucks.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.log('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ✅ Handle preflight OPTIONS requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io available in routes
app.set('io', io);

// ✅ Connect DB
connectDB();

// ✅ Health check route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'APTrucking API Running',
    version: '2.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ✅ Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/loads', require('./routes/loadRoutes'));
app.use('/api/trucks', require('./routes/truckRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/ads', require('./routes/adRoutes'));
app.use('/api/referrals', require('./routes/referralRoutes'));

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS error: origin not allowed' });
  }
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// ✅ Socket.IO events
io.on('connection', (socket) => {
  console.log('[Socket] Connected:', socket.id);

  socket.on('driver:location', (data) => {
    socket.broadcast.emit('truck:location', data);
    socket.broadcast.emit('location:update', data);
  });

  socket.on('driver:status', (data) => {
    socket.broadcast.emit('driver:status', data);
  });

  socket.on('message:send', (data) => {
    socket.broadcast.emit('message:new', data);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ APTrucking Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
});
