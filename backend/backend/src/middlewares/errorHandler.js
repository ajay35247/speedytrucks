import logger from '../utils/logger.js';

export const errorHandler = (error, req, res, next) => {
  logger.error(error.message, { stack: error.stack, path: req.path });

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
  });
};
