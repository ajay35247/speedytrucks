const Redis = require("ioredis");
const logger = require("../utils/logger");
let client;
const connectRedis = () => {
  client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", { retryStrategy: (t) => Math.min(t*100, 3000), maxRetriesPerRequest: 3 });
  client.on("connect", () => logger.info("✅ Redis connected"));
  client.on("error", (err) => logger.error(`❌ Redis: ${err.message}`));
  return client;
};
const getRedis = () => { if (!client) throw new Error("Redis not initialized"); return client; };
module.exports = connectRedis;
module.exports.getRedis = getRedis;
