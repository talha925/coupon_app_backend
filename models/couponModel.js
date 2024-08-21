const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true },
    description: { type: String },
    discount: { type: Number, required: true },
    expirationDate: { type: Date, required: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    affiliateLink: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Coupon', couponSchema);
