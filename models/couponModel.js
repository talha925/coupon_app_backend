const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    discount: { type: Number, required: true },
    expirationDate: { type: Date }, // Optional if not always provided
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    affiliateLink: { type: String, required: true }
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
