const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    website: { type: String, required: true },
    description: { type: String },
    coupons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }] // Reference to Coupon model
});

module.exports = mongoose.model('Store', storeSchema);
