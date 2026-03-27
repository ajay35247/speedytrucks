"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.ensureRedisConnected = ensureRedisConnected;
const redis_1 = require("redis");
const env_1 = require("../config/env");
const redis = (0, redis_1.createClient)({ url: env_1.env.redisUrl });
exports.redis = redis;
let redisReadyPromise = null;
redis.on('error', (error) => {
    // Keep process alive and surface connectivity issues in logs.
    console.error('[redis]', error);
});
function ensureRedisConnected() {
    if (!redisReadyPromise) {
        redisReadyPromise = redis.connect().then(() => undefined);
    }
    return redisReadyPromise;
}
