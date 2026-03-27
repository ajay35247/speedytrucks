"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = __importDefault(require("./routes"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimit_1 = require("./middleware/rateLimit");
const requestContext_1 = require("./middleware/requestContext");
const auditLog_1 = require("./middleware/auditLog");
const sentry_1 = require("./lib/sentry");
const health_1 = __importDefault(require("./routes/health"));
function getCorsOptions() {
    if (env_1.env.corsOrigin === '*') {
        return { origin: true, credentials: true };
    }
    const allowedOrigins = env_1.env.corsOrigin.split(',').map((item) => item.trim()).filter(Boolean);
    return {
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error('CORS origin not allowed'));
        },
        credentials: true,
    };
}
function createApp() {
    const app = (0, express_1.default)();
    app.set('trust proxy', env_1.env.trustProxy);
    (0, sentry_1.initSentry)(env_1.env.sentryDsn);
    app.use((0, cors_1.default)(getCorsOptions()));
    app.use((0, helmet_1.default)());
    app.use(express_1.default.json({
        limit: '5mb',
        verify: (req, _res, buffer) => {
            req.rawBody = buffer.toString('utf8');
        },
    }));
    app.use(requestContext_1.requestContext);
    app.use(rateLimit_1.apiLimiter);
    app.use((0, morgan_1.default)('combined'));
    app.use(auditLog_1.auditLog);
    app.use('/healthz', health_1.default);
    app.use('/api', routes_1.default);
    app.use(errorHandler_1.errorHandler);
    return app;
}
