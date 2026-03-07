const Redis = require("ioredis");
const logger = require("../utils/logger");
let client = null;
const connectRedis = () => {
  if (!process.env.REDIS_URL) {
    logger.warn("⚠️ REDIS_URL not set - Redis disabled");
    return null;
  }
  try {
    client = new Redis(process.env.REDIS_URL, {
      retryStrategy: (t) => t > 3 ? null : Math.min(t * 100, 3000),
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    client.on("connect", () => logger.info("✅ Redis connected"));
    client.on("error", (err) => logger.warn(`⚠️ Redis: ${err.message}`));
  } catch (err) {
    logger.warn(`⚠️ Redis skipped: ${err.message}`);
  }
  return client;
};
const getRedis = () => client;
module.exports = connectRedis;
module.exports.getRedis = getRedis;
