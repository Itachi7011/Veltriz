const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[game-world-service] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('[game-world-service] MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
