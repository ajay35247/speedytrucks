const logger = require("../utils/logger");
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  if (err.code === 11000) { const field = Object.keys(err.keyValue)[0]; message = `${field} already exists.`; statusCode = 409; }
  if (err.name === "ValidationError") { message = Object.values(err.errors).map(e => e.message).join(". "); statusCode = 400; }
  if (err.name === "CastError") { message = "Invalid resource ID."; statusCode = 400; }
  if (err.name === "JsonWebTokenError") { message = "Invalid token."; statusCode = 401; }
  logger.error({ message: err.message, url: req.originalUrl });
  res.status(statusCode).json({ success: false, message, ...(process.env.NODE_ENV === "development" && { stack: err.stack }) });
};
module.exports = errorHandler;