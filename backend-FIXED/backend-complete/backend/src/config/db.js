const mongoose = require('mongoose');

const connectDB = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB Connected');
      return;
    } catch (err) {
      retries--;
      console.log(`❌ MongoDB failed. Retrying... (${retries} left): ${err.message}`);
      if (retries === 0) {
        console.error('MongoDB connection failed permanently');
        return;
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
};

module.exports = connectDB;
