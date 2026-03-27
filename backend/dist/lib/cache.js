"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCache = getCache;
exports.setCache = setCache;
exports.delCache = delCache;
const redis_1 = require("./redis");
async function getCache(key) {
    await (0, redis_1.ensureRedisConnected)();
    const value = await redis_1.redis.get(key);
    return value ? JSON.parse(value) : null;
}
async function setCache(key, value, ttlSeconds) {
    await (0, redis_1.ensureRedisConnected)();
    await redis_1.redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
}
async function delCache(key) {
    await (0, redis_1.ensureRedisConnected)();
    await redis_1.redis.del(key);
}
