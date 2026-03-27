"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const types_1 = require("../types");
const sentry_1 = require("../lib/sentry");
const logger_1 = require("../lib/logger");
function errorHandler(err, req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: err.flatten(),
            requestId: req.requestId,
        });
    }
    if (err instanceof types_1.AppError) {
        return res.status(err.statusCode).json({
            message: err.message,
            code: err.code,
            details: err.details,
            requestId: req.requestId,
        });
    }
    (0, sentry_1.captureException)(err);
    logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), path: req.originalUrl, requestId: req.requestId }, 'Unhandled request error');
    return res.status(500).json({
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        requestId: req.requestId,
    });
}
