const mongoose = require('mongoose');
const Coupon = require('../models/couponModel');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');

        // 🔥 Remove the unique index from `code` field
        try {
            await Coupon.collection.dropIndex("code_1");
            console.log("✅ Unique index on 'code' removed successfully!");
        } catch (err) {
            console.log("⚠️ Index not found or already removed");
        }

    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
