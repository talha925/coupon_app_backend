const Coupon = require('../models/couponModel');
const Store = require('../models/storeModel');

// Get all coupons
exports.getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().populate({
            path: 'store',
            select: 'name' // Include only necessary fields
        });
        res.status(200).json({ status: 'success', data: coupons });
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};

// Create a new coupon
exports.createCoupon = async (req, res) => {
    const { code, description, discount, expirationDate, store, affiliateLink } = req.body;
    try {
        const newCoupon = new Coupon({ code, description, discount, expirationDate, store, affiliateLink });
        await newCoupon.save();

        // Add the new coupon to the store's coupons array
        await Store.findByIdAndUpdate(store, { $push: { coupons: newCoupon._id } });

        res.status(201).json({ status: 'success', data: newCoupon });
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};

// Get a coupon by ID
exports.getCouponById = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id).populate({
            path: 'store',
            select: 'name' // Include only necessary fields
        });
        if (!coupon) return res.status(404).json({ status: 'error', error: 'Coupon not found' });
        res.status(200).json({ status: 'success', data: coupon });
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};

// Update a coupon
exports.updateCoupon = async (req, res) => {
    try {
        const updatedCoupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('store');
        if (!updatedCoupon) return res.status(404).json({ status: 'error', error: 'Coupon not found' });
        res.status(200).json({ status: 'success', data: updatedCoupon });
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};

// Delete a coupon
exports.deleteCoupon = async (req, res) => {
    try {
        const deletedCoupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!deletedCoupon) return res.status(404).json({ status: 'error', error: 'Coupon not found' });

        // Remove the deleted coupon from the store's coupons array
        await Store.findByIdAndUpdate(deletedCoupon.store, { $pull: { coupons: deletedCoupon._id } });

        res.status(200).json({ status: 'success', message: 'Coupon deleted successfully' });
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};
