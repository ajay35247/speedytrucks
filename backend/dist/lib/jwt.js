"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashToken = hashToken;
exports.createSessionId = createSessionId;
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
const node_crypto_1 = __importDefault(require("node:crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function hashToken(token) {
    return node_crypto_1.default.createHash('sha256').update(token).digest('hex');
}
function createSessionId() {
    return node_crypto_1.default.randomUUID();
}
function signAccessToken(user) {
    return jsonwebtoken_1.default.sign({
        ...user,
        sessionId: user.sessionId || createSessionId(),
        tokenType: 'access',
    }, env_1.env.jwtSecret, { expiresIn: env_1.env.jwtAccessTtl });
}
function signRefreshToken(user) {
    return jsonwebtoken_1.default.sign({
        ...user,
        sessionId: user.sessionId || createSessionId(),
        tokenType: 'refresh',
    }, env_1.env.jwtSecret, { expiresIn: env_1.env.jwtRefreshTtl });
}
function verifyWithSecret(token, secret, tokenType) {
    const payload = jsonwebtoken_1.default.verify(token, secret);
    if (payload.tokenType !== tokenType || !payload.sessionId) {
        throw new Error(`Invalid ${tokenType} token payload`);
    }
    return payload;
}
function verifyAccessToken(token) {
    return verifyWithSecret(token, env_1.env.jwtSecret, 'access');
}
function verifyRefreshToken(token) {
    return verifyWithSecret(token, env_1.env.jwtSecret, 'refresh');
}
