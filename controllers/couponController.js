const mongoose = require('mongoose');
const Coupon = require('../models/couponModel');
const Store = require('../models/storeModel');
const { createCouponSchema } = require('../validators/couponValidator');
const CustomError = require('../errors/customError');
const { formatCoupon } = require('../utils/couponUtils');

// Get all coupons, grouped by store ID (only store ID will be shown)
exports.getCoupons = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    // Fetch coupons directly, only with necessary coupon details (exclude store details)
    const coupons = await Coupon.find({ isValid: true })
      .skip(skip)
      .limit(limit)
      .select('-__v') // Remove unnecessary fields like __v

    // Count total valid coupons
    const totalCoupons = await Coupon.countDocuments({ isValid: true });

    // Format the response, including only store ID and coupon details
    const formattedCoupons = coupons.map(coupon => ({
      _id: coupon._id,
      offerDetails: coupon.offerDetails,
      code: coupon.code,
      active: coupon.active,
      isValid: coupon.isValid,
      featuredForHome: coupon.featuredForHome,
      hits: coupon.hits,
      lastAccessed: coupon.lastAccessed,
      storeId: coupon.store  // Only include store ID, no other store details
    }));

    res.status(200).json({
      status: 'success',
      data: formattedCoupons,
      metadata: {
        totalCoupons: totalCoupons,
        currentPage: page,
        couponsPerPage: limit
      }
    });
  } catch (error) {
    next(error);
  }
};


// Create a new coupon
exports.createCoupon = async (req, res, next) => {
  try {
    const { error } = createCouponSchema.validate(req.body);
    if (error) throw new CustomError(error.details[0].message, 400);

    const storeExists = await Store.findById(req.body.store);
    if (!storeExists) throw new CustomError('Invalid Store ID', 400);

    // Ensure unique coupon code
    const existingCoupon = await Coupon.findOne({ code: req.body.code });
    if (existingCoupon) throw new CustomError('Coupon code already exists', 400);

    const newCoupon = await Coupon.create(req.body);
    await Store.findByIdAndUpdate(req.body.store, { $push: { coupons: newCoupon._id } });

    res.status(201).json({ status: 'success', data: newCoupon });
  } catch (error) {
    next(error);
  }
};

// Update a coupon
exports.updateCoupon = async (req, res, next) => {
  try {
    const { active, code, expirationDate, isValid } = req.body;

    if (typeof active !== 'undefined' && active === false) {
      throw new CustomError("Cannot update inactive coupon", 400);
    }

    if (expirationDate && isNaN(Date.parse(expirationDate))) {
      throw new CustomError("Invalid expiration date format", 400);
    }

    const updateData = { ...req.body };

    const updatedCoupon = await Coupon.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!updatedCoupon) throw new CustomError('Coupon not found', 404);

    res.status(200).json({ status: 'success', data: formatCoupon(updatedCoupon) });
  } catch (error) {
    next(error);
  }
};

// Delete a coupon
exports.deleteCoupon = async (req, res, next) => {
  try {
    const deletedCoupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!deletedCoupon) throw new CustomError('Coupon not found', 404);

    await Store.findByIdAndUpdate(deletedCoupon.store, { $pull: { coupons: deletedCoupon._id } });

    res.status(200).json({ status: 'success', message: 'Coupon deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Track URL hits for a coupon
exports.trackCouponUrl = async (req, res, next) => {
  try {
    const { couponId } = req.params;

    // Validate couponId
    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      throw new CustomError('Invalid Coupon ID', 400);
    }

    // Find and update the coupon
    const coupon = await Coupon.findByIdAndUpdate(
      couponId,
      { $inc: { hits: 1 }, $set: { lastAccessed: new Date() } },
      { new: true }
    );

    // Check if coupon exists
    if (!coupon) {
      throw new CustomError('Coupon not found', 404);
    }

    // Log the tracking event
    console.log(`Coupon tracked: ${coupon._id}, Hits: ${coupon.hits}, Last Accessed: ${coupon.lastAccessed}`);

    // Send the response
    res.status(200).json({ status: 'success', data: formatCoupon(coupon) });
  } catch (error) {
    next(error);
  }
};

// Get a coupon by ID
exports.getCouponById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new CustomError('Invalid Coupon ID', 400);
    }

    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) throw new CustomError('Coupon not found', 404);

    res.status(200).json({ status: 'success', data: formatCoupon(coupon) });
  } catch (error) {
    next(error);
  }
};
