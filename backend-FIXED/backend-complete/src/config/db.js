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
      console.log(`❌ MongoDB failed. Retrying... (${retries} left)`);
      if (retries === 0) {
        console.error('MongoDB connection failed after all retries:', err.message);
        // Don't crash - keep server running
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
};

module.exports = connectDB;
