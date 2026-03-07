const mongoose = require("mongoose");
const logger = require("../utils/logger");
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 10000 });
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error(`❌ MongoDB: ${err.message}`);
    logger.info("Retrying MongoDB in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};
module.exports = connectDB;
