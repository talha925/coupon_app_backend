const mongoose = require('mongoose');
const Coupon = require('../models/couponModel');
const Store = require('../models/storeModel');
const AppError = require('../errors/AppError');
const { formatCoupon } = require('../utils/couponUtils');

/**
 * Get all coupons with pagination
 * @param {Object} queryParams - Query parameters
 * @returns {Object} Coupons with pagination info
 */
exports.getCoupons = async (queryParams) => {
    try {
        const { page = 1, limit = 10, store, active, isValid = true, featuredForHome } = queryParams;
        
        // Build query based on parameters
        const query = { isValid };
        if (store) query.store = store;
        if (active !== undefined) query.active = active === 'true';
        if (featuredForHome !== undefined) query.featuredForHome = featuredForHome === 'true';
        
        // Execute query with pagination
        const coupons = await Coupon.find(query)
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .select('-__v')
            .lean();
            
        // Get total count for pagination
        const totalCoupons = await Coupon.countDocuments(query);
        
        // Format coupons
        const formattedCoupons = coupons.map(coupon => ({
            _id: coupon._id,
            offerDetails: coupon.offerDetails,
            code: coupon.code,
            active: coupon.active,
            isValid: coupon.isValid,
            featuredForHome: coupon.featuredForHome,
            hits: coupon.hits,
            lastAccessed: coupon.lastAccessed,
            storeId: coupon.store
        }));
        
        return {
            coupons: formattedCoupons,
            totalPages: Math.ceil(totalCoupons / parseInt(limit)),
            currentPage: parseInt(page),
            totalCoupons
        };
    } catch (error) {
        console.error('Error in couponService.getCoupons:', error);
        throw error;
    }
};

/**
 * Create a new coupon
 * @param {Object} couponData - Coupon data
 * @returns {Object} Created coupon
 */
exports.createCoupon = async (couponData) => {
    try {
        // Check if store exists
        const storeExists = await Store.findById(couponData.store);
        if (!storeExists) {
            throw new AppError('Invalid Store ID', 400);
        }
        
        // Check for duplicate code if provided
        if (couponData.code) {
            const existingCoupon = await Coupon.findOne({ code: couponData.code });
            if (existingCoupon) {
                throw new AppError('Coupon code already exists', 400);
            }
        }
        
        // Create coupon
        const newCoupon = await Coupon.create(couponData);
        
        // Add coupon to store
        await Store.findByIdAndUpdate(
            couponData.store, 
            { $push: { coupons: newCoupon._id } }
        );
        
        return newCoupon;
    } catch (error) {
        console.error('Error in couponService.createCoupon:', error);
        throw error;
    }
};

/**
 * Update a coupon
 * @param {String} id - Coupon ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated coupon
 */
exports.updateCoupon = async (id, updateData) => {
    try {
        // Validate active status
        if (typeof updateData.active !== 'undefined' && updateData.active === false) {
            throw new AppError("Cannot update inactive coupon", 400);
        }
        
        // Validate expiration date if provided
        if (updateData.expirationDate && isNaN(Date.parse(updateData.expirationDate))) {
            throw new AppError("Invalid expiration date format", 400);
        }
        
        // Update coupon
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        );
        
        if (!updatedCoupon) {
            throw new AppError('Coupon not found', 404);
        }
        
        return formatCoupon(updatedCoupon);
    } catch (error) {
        console.error('Error in couponService.updateCoupon:', error);
        throw error;
    }
};

/**
 * Delete a coupon
 * @param {String} id - Coupon ID
 * @returns {Object} Deleted coupon
 */
exports.deleteCoupon = async (id) => {
    try {
        const deletedCoupon = await Coupon.findByIdAndDelete(id);
        
        if (!deletedCoupon) {
            throw new AppError('Coupon not found', 404);
        }
        
        // Remove coupon from store
        await Store.findByIdAndUpdate(
            deletedCoupon.store, 
            { $pull: { coupons: deletedCoupon._id } }
        );
        
        return deletedCoupon;
    } catch (error) {
        console.error('Error in couponService.deleteCoupon:', error);
        throw error;
    }
};

/**
 * Track coupon usage
 * @param {String} couponId - Coupon ID
 * @returns {Object} Updated coupon
 */
exports.trackCouponUsage = async (couponId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(couponId)) {
            throw new AppError('Invalid Coupon ID', 400);
        }
        
        const coupon = await Coupon.findByIdAndUpdate(
            couponId,
            { 
                $inc: { hits: 1 }, 
                $set: { lastAccessed: new Date() } 
            },
            { new: true }
        );
        
        if (!coupon) {
            throw new AppError('Coupon not found', 404);
        }
        
        return formatCoupon(coupon);
    } catch (error) {
        console.error('Error in couponService.trackCouponUsage:', error);
        throw error;
    }
};

/**
 * Get coupon by ID
 * @param {String} id - Coupon ID
 * @returns {Object} Coupon
 */
exports.getCouponById = async (id) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid Coupon ID', 400);
        }
        
        const coupon = await Coupon.findById(id).lean();
        
        if (!coupon) {
            throw new AppError('Coupon not found', 404);
        }
        
        return formatCoupon(coupon);
    } catch (error) {
        console.error('Error in couponService.getCouponById:', error);
        throw error;
    }
}; 