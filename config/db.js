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
 * Monitor mongoose connection events
 */
const monitorMongooseConnection = () => {
    mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected!');
    });
    
    mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected!');
    });
    
    mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
    });
    
    // Handle process termination
    process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed due to application termination');
        process.exit(0);
    });
};

module.exports = connectDB;
