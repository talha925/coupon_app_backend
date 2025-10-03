const mongoose = require('mongoose');
const Coupon = require('../models/couponModel');

/**
 * Connect to MongoDB with optimized settings
 */
const connectDB = async () => {
    try {
        // Connection options
        const options = {
            maxPoolSize: 10,           // Maintain up to 10 socket connections
            minPoolSize: 2,            // Keep at least 2 connections open
            socketTimeoutMS: 45000,    // Close sockets after 45 seconds of inactivity
            serverSelectionTimeoutMS: 5000, // Time spent trying to select a server
            connectTimeoutMS: 10000,   // Give up initial connection after 10 seconds
            family: 4,                 // Use IPv4, skip trying IPv6
            retryWrites: true,         // Retry write operations if they fail
            retryReads: true,          // Retry read operations if they fail
            writeConcern: { w: 'majority' } // Wait for majority of nodes to confirm write
        };

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, options);
        
        console.log('✅ MongoDB Connected');
        
        // Setup database indexing and monitoring
        setupDatabaseIndexes();
        
        // Monitor MongoDB connection
        monitorMongooseConnection();

    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

/**
 * Setup database indexes and perform maintenance
 */
const setupDatabaseIndexes = async () => {
    try {
        // 🔥 Remove the unique index from `code` field
        try {
            await Coupon.collection.dropIndex("code_1");
            console.log("✅ Unique index on 'code' removed successfully!");
        } catch (err) {
            console.log("⚠️ Index not found or already removed");
        }
        
        // Add any other index maintenance here
    } catch (error) {
        console.error("❌ Error setting up database indexes:", error);
    }
};

/**
 * Monitor MongoDB connection health and performance
 */
const monitorMongooseConnection = () => {
    const connection = mongoose.connection;
    
    // 🔥 CRITICAL: Connection pool monitoring
    let connectionStats = {
        connected: 0,
        disconnected: 0,
        errors: 0,
        lastError: null,
        poolSize: 0
    };
    
    connection.on('connected', () => {
        connectionStats.connected++;
        console.log('🟢 MongoDB Connected - Pool initialized');
    });
    
    connection.on('disconnected', () => {
        connectionStats.disconnected++;
        console.log('🔴 MongoDB Disconnected');
        
        // 🔥 CRITICAL: Attempt reconnection with exponential backoff
        setTimeout(() => {
            console.log('🔄 Attempting MongoDB reconnection...');
            mongoose.connect(process.env.MONGO_URI).catch(err => {
                console.error('❌ Reconnection failed:', err.message);
            });
        }, Math.min(1000 * Math.pow(2, connectionStats.disconnected), 30000));
    });
    
    connection.on('error', (err) => {
        connectionStats.errors++;
        connectionStats.lastError = {
            message: err.message,
            timestamp: new Date().toISOString()
        };
        console.error('❌ MongoDB Error:', err.message);
        
        // 🔥 CRITICAL: Don't crash on connection errors
        if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
            console.log('🔄 Network/Timeout error - attempting recovery...');
        }
    });
    
    // 🔥 CRITICAL: Monitor connection pool health
    setInterval(() => {
        const db = connection.db;
        if (db && db.serverConfig) {
            const poolSize = db.serverConfig.connections ? db.serverConfig.connections.length : 0;
            connectionStats.poolSize = poolSize;
            
            if (poolSize === 0) {
                console.warn('⚠️ MongoDB connection pool is empty');
            }
        }
    }, 30000); // Check every 30 seconds
    
    // 🔥 CRITICAL: Expose connection stats for health checks
    connection.getStats = () => connectionStats;
    
    // Handle process termination
    process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed due to application termination');
        process.exit(0);
    });
};

module.exports = connectDB;
