const sendSuccess = (res, statusCode = 200, message, data = {}) => res.status(statusCode).json({ success: true, message, data });
const sendError = (res, statusCode = 500, message, errors = null) => res.status(statusCode).json({ success: false, message, ...(errors && { errors }) });
module.exports = { sendSuccess, sendError };