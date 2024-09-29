const Coupon = require('../models/couponModel');
const Store = require('../models/storeModel');

// Get all coupons
exports.getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().populate({
            path: 'store',
            select: 'name image' // Only include store's name and image
        });
        res.status(200).json({ status: 'success', data: coupons });
    } catch (error) {
        console.error("Error fetching coupons:", error); // Log error
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};

// Create a new coupon
exports.createCoupon = async (req, res) => {
    const { code, description, discount, expirationDate, store, affiliateLink } = req.body;

    try {
        console.log("Received Request Data:", req.body); // Log request data

        // Check if store exists
        const storeExists = await Store.findById(store);
        if (!storeExists) {
            console.log("Store ID invalid or not found:", store); // Log invalid store ID
            return res.status(400).json({ status: 'error', error: 'Invalid store ID' });
        }

        console.log("Store found:", storeExists.name); // Log store if found

        // Create new coupon
        const newCoupon = new Coupon({
            code,
            description,
            discount,
            expirationDate,
            store,
            affiliateLink
        });

        console.log("Creating new coupon with data:", newCoupon); // Log coupon creation data

        await newCoupon.save();
        console.log("Coupon saved successfully:", newCoupon); // Log successful coupon save

        // Add the new coupon to the store's coupons array
        await Store.findByIdAndUpdate(store, { $push: { coupons: newCoupon._id } });

        console.log("Coupon added to store's coupons array"); // Log update success
        res.status(201).json({ status: 'success', data: newCoupon });

    } catch (error) {
        console.error("Error creating coupon:", error); // Log the detailed error object
        if (error.name === 'ValidationError') {
            res.status(400).json({ status: 'error', error: 'Validation error', details: error.message });
        } else if (error.code === 11000) {
            res.status(409).json({ status: 'error', error: 'Duplicate coupon code' });
        } else {
            res.status(500).json({ status: 'error', error: 'Internal Server Error' });
        }
    }
};

// Get a coupon by ID
exports.getCouponById = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id).populate({
            path: 'store',
            select: 'name' // Include only necessary fields
        });
        if (!coupon) {
            return res.status(404).json({ status: 'error', error: 'Coupon not found' });
        }
        res.status(200).json({ status: 'success', data: coupon });
    } catch (error) {
        console.error("Error fetching coupon by ID:", error); // Log error
        res.status(500).json({ status: 'error', error: 'Server Error' });
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
