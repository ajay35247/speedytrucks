/**
 * SpeedyTrucks — Production Express + Socket.io Server v2
 */
require("dotenv").config();
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const morgan = require("morgan");

const connectDB = require("./config/db");
const connectRedis = require("./config/redis");
const logger = require("./utils/logger");
const errorHandler = require("./middlewares/errorHandler");
const { globalLimiter } = require("./middlewares/rateLimiter");
const initSockets = require("./sockets");

const authRoutes         = require("./routes/auth.routes");
const userRoutes         = require("./routes/user.routes");
const adminRoutes        = require("./routes/admin.routes");
const freightRoutes      = require("./routes/freight.routes");
const truckRoutes        = require("./routes/truck.routes");
const bidRoutes          = require("./routes/bid.routes");
const paymentRoutes      = require("./routes/payment.routes");
const kycRoutes          = require("./routes/kyc.routes");
const trackingRoutes     = require("./routes/tracking.routes");
const walletRoutes       = require("./routes/wallet.routes");
const chatRoutes         = require("./routes/chat.routes");
const adsRoutes          = require("./routes/ads.routes");
const referralRoutes     = require("./routes/referral.routes");
const bookingRoutes      = require("./routes/booking.routes");
const notificationRoutes = require("./routes/notification.routes");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true },
  transports: ["websocket","polling"],
  pingTimeout: 60000,
});
initSockets(io);
app.set("io", io);

connectDB();
connectRedis();

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(compression());
app.use(mongoSanitize());
app.use(hpp());
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));
app.use("/api", globalLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "SpeedyTrucks API v2", timestamp: new Date(), uptime: process.uptime() }));

app.use("/api/auth",          authRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/freight",       freightRoutes);
app.use("/api/trucks",        truckRoutes);
app.use("/api/bids",          bidRoutes);
app.use("/api/payments",      paymentRoutes);
app.use("/api/kyc",           kycRoutes);
app.use("/api/tracking",      trackingRoutes);
app.use("/api/wallet",        walletRoutes);
app.use("/api/chat",          chatRoutes);
app.use("/api/ads",           adsRoutes);
app.use("/api/referrals",     referralRoutes);
app.use("/api/bookings",      bookingRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 SpeedyTrucks API on port ${PORT} [${process.env.NODE_ENV}]`);
  logger.info(`📡 Socket.io enabled`);
});

module.exports = app;
