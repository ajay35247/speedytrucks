const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const { sendError } = require("../utils/response");

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer ")) token = req.headers.authorization.split(" ")[1];
    else if (req.cookies?.accessToken) token = req.cookies.accessToken;
    if (!token) return sendError(res, 401, "Not authenticated. Please log in.");
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return sendError(res, 401, "User no longer exists.");
    if (user.status === "banned") return sendError(res, 403, "Account banned.");
    if (user.status === "suspended") return sendError(res, 403, "Account suspended. Contact support.");
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return sendError(res, 401, "Session expired. Please log in again.");
    return sendError(res, 401, "Invalid token.");
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return sendError(res, 403, `Access denied. Required role: ${roles.join(" or ")}`);
  next();
};

const requireKYC = (req, res, next) => {
  if (req.user.kycStatus !== "approved") return sendError(res, 403, "KYC verification required to perform this action.");
  next();
};

module.exports = { protect, authorize, requireKYC };