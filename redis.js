const Redis = require("ioredis");
const logger = require("../utils/logger");
let client;
const connectRedis = () => {
  try {
    client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", { retryStrategy: (t) => t > 3 ? null : Math.min(t*100, 3000), maxRetriesPerRequest: 1, lazyConnect: true });
    client.on("connect", () => logger.info("✅ Redis connected"));
    client.on("error", (err) => logger.warn(`⚠️ Redis unavailable: ${err.message}`));
  } catch(err) {
    logger.warn(`⚠️ Redis skipped: ${err.message}`);
  }
  return client;
};
const getRedis = () => { if (!client) return null; return client; };
module.exports = connectRedis;
module.exports.getRedis = getRedis;
