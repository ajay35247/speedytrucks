"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = auditLog;
function auditLog(req, res, next) {
    const startedAt = Date.now();
    res.on('finish', () => {
        const body = ['password', 'otp', 'token', 'refreshToken'].reduce((acc, key) => {
            if (req.body && typeof req.body === 'object' && key in req.body) {
                acc[key] = '[REDACTED]';
            }
            return acc;
        }, {});
        console.info(JSON.stringify({
            type: 'audit',
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            userId: req.user?.id,
            role: req.user?.role,
            ip: req.ip,
            redactions: body,
        }));
    });
    next();
}
