const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    offerName: { type: String, required: true },
    offerBox: { type: String, required: true },
    offerDetails: { type: String, required: true },
    code: { type: String, sparse: true }, // ✅ Removed unique constraint
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    discount: { type: Number, required: true },
    expirationDate: { type: Date, default: null },
    active: { type: Boolean, default: true }, // Active toggle
    featuredForHome: { type: Boolean, default: false },
    flickerButton: { type: Boolean, default: false },
    verifiedButton: { type: Boolean, default: false },
    exclusiveButton: { type: Boolean, default: false }
});

// ✅ Ensure either "Code" or "Active" is present
couponSchema.pre('validate', function (next) {
    if (!this.active && !this.code) {
        return next(new Error("Either 'Code' or 'Active' must be provided"));
    }
    next();
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
