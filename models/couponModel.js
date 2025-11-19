const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    offerDetails: { type: String, required: true },
    code: { type: String },
    active: { type: Boolean, default: true },
    isValid: { type: Boolean, default: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    featuredForHome: { type: Boolean, default: false },
    hits: { type: Number, default: 0 },
    lastAccessed: { type: Date, default: null },
    order: { type: Number, default: 0 }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

couponSchema.index({ store: 1, isValid: 1, active: 1, order: 1 });
couponSchema.index({ store: 1, order: 1 });
couponSchema.index({ store: 1, featuredForHome: 1 });
couponSchema.index({ store: 1, code: 1 }, { partialFilterExpression: { code: { $type: 'string' } } });
// ✅ Ensure either "Code" or "Active" is present
couponSchema.pre('validate', function (next) {
    if (!this.active && !this.code) {
        return next(new Error("Either 'Code' or 'Active' must be provided"));
    }
    next();
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;