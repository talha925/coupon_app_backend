const Coupon = require('../models/couponModel');

// Get all coupons
exports.getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().populate('store');
        res.status(200).json(coupons);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

// Create a new coupon
exports.createCoupon = async (req, res) => {
    const { code, description, discount, expirationDate, store, affiliateLink } = req.body;
    try {
        const newCoupon = new Coupon({ code, description, discount, expirationDate, store, affiliateLink });
        await newCoupon.save();
        res.status(201).json(newCoupon);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

// Get a coupon by ID
exports.getCouponById = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id).populate('store');
        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
        res.status(200).json(coupon);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

// Update a coupon
exports.updateCoupon = async (req, res) => {
    try {
        const updatedCoupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('store');
        if (!updatedCoupon) return res.status(404).json({ error: 'Coupon not found' });
        res.status(200).json(updatedCoupon);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

// Delete a coupon
exports.deleteCoupon = async (req, res) => {
    try {
        const deletedCoupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!deletedCoupon) return res.status(404).json({ error: 'Coupon not found' });
        res.status(200).json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};
