import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Fail fast instead of hanging requests if the DB is unreachable.
      serverSelectionTimeoutMS: 15000,
      // Connection pool sized for bursts: many users hitting the API at once
      // queue on a bounded pool instead of opening unbounded connections.
      maxPoolSize: Number(process.env.MONGO_MAX_POOL || 50),
      minPoolSize: Number(process.env.MONGO_MIN_POOL || 5),
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 60000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
