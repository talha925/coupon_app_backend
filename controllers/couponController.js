const Coupon = require('../models/couponModel');
const Store = require('../models/storeModel');

// Get all coupons
exports.getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().populate('store', 'name image');
        res.status(200).json({ status: 'success', data: coupons });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ status: 'error', message: 'Error fetching coupons', error: error.message });
    }
};

// Create a new coupon
exports.createCoupon = async (req, res) => {
    const { code, short_description, long_description, discount, expirationDate, store, affiliateLink } = req.body;
    if (!code || !discount || !store) {
        return res.status(400).json({ status: 'error', message: 'Missing required fields: code, discount, or store' });
    }
    try {
        const storeExists = await Store.findById(store);
        if (!storeExists) {
            return res.status(400).json({ status: 'error', message: 'Invalid store ID' });
        }

        const newCoupon = await Coupon.create({ code, short_description, long_description, discount, expirationDate, store, affiliateLink });
        await Store.findByIdAndUpdate(store, { $push: { coupons: newCoupon._id } });

        res.status(201).json({ status: 'success', data: newCoupon });
    } catch (error) {
        if (error.code === 11000) {
            res.status(409).json({ status: 'error', message: 'Duplicate coupon code' });
        } else {
            console.error('Error creating coupon:', error);
            res.status(500).json({ status: 'error', message: 'Error creating coupon', error: error.message });
        }
    }
};

// Get a coupon by ID
exports.getCouponById = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id).populate('store', 'name');
        if (!coupon) {
            return res.status(404).json({ status: 'error', message: 'Coupon not found' });
        }
        res.status(200).json({ status: 'success', data: coupon });
    } catch (error) {
        console.error('Error fetching coupon by ID:', error);
        res.status(500).json({ status: 'error', message: 'Error fetching coupon', error: error.message });
    }
};

// Update a coupon
exports.updateCoupon = async (req, res) => {
    try {
        const updatedCoupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('store');
        if (!updatedCoupon) {
            return res.status(404).json({ status: 'error', error: 'Coupon not found' });
        }
        res.status(200).json({ status: 'success', data: updatedCoupon });
    } catch (error) {
        console.error("Error updating coupon:", error); // Log error
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};

// Delete a coupon
exports.deleteCoupon = async (req, res) => {
    try {
        const deletedCoupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!deletedCoupon) {
            return res.status(404).json({ status: 'error', error: 'Coupon not found' });
        }

        // Remove the deleted coupon from the store's coupons array
        await Store.findByIdAndUpdate(deletedCoupon.store, { $pull: { coupons: deletedCoupon._id } });

        res.status(200).json({ status: 'success', message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error("Error deleting coupon:", error); // Log error
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};
