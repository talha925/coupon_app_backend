const mongoose = require('mongoose');
const Coupon = require('../models/couponModel');

const mongoOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  family: 4,
  retryWrites: true,
  retryReads: true,
  writeConcern: { w: 'majority' }
};

/**
 * ✅ Reusable reconnection logic
 */
const reconnectToMongo = async () => {
  try {
    console.log('🔄 Attempting MongoDB reconnection...');
    await mongoose.connect(process.env.MONGO_URI, mongoOptions);
  } catch (err) {
    console.error('❌ Reconnection failed:', err.message);
  }
};

/**
 * ✅ Main Connection Function
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, mongoOptions);
    console.log('✅ MongoDB Connected');
    await setupDatabaseIndexes();
    monitorMongooseConnection();
  } catch (error) {
    console.error('❌ MongoDB Initial Connection Error:', error);
    process.exit(1);
  }
};

/**
 * ✅ Database Index Maintenance
 */
const setupDatabaseIndexes = async () => {
  try {
    try {
      await Coupon.collection.dropIndex("code_1");
      console.log("✅ Unique index on 'code' removed successfully!");
    } catch (err) {
      console.log("⚠️ Index not found or already removed");
    }

    // Add new indexes here if needed
  } catch (error) {
    console.error("❌ Error setting up database indexes:", error);
  }
};

/**
 * ✅ Connection Monitoring & Recovery
 */
const monitorMongooseConnection = () => {
  const connection = mongoose.connection;

  let connectionStats = {
    connected: 0,
    disconnected: 0,
    errors: 0,
    lastError: null
  };

  connection.on('connected', () => {
    connectionStats.connected++;
    console.log('🟢 MongoDB Connected - Pool initialized');
  });

  connection.on('disconnected', () => {
    connectionStats.disconnected++;
    console.log('🔴 MongoDB Disconnected');

    // Exponential backoff for reconnection
    const backoffTime = Math.min(
      1000 * Math.pow(2, connectionStats.disconnected % 6),
      30000
    );

    setTimeout(reconnectToMongo, backoffTime);
  });

  connection.on('error', err => {
    connectionStats.errors++;
    connectionStats.lastError = {
      message: err.message,
      timestamp: new Date().toISOString()
    };
    console.error('❌ MongoDB Error:', err.message);

    if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
      console.log('🔄 Network/Timeout error - attempting recovery...');
    }
  });

  // ✅ Graceful Shutdown
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed due to application termination');
    process.exit(0);
  });
};

module.exports = connectDB;
