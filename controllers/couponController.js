const mongoose = require('mongoose');
const Coupon = require('../models/couponModel');
const Store = require('../models/storeModel');
const { createCouponSchema } = require('../validators/couponValidator');
const CustomError = require('../errors/customError');
const { formatCoupon } = require('../utils/couponUtils');

// Get all coupons
exports.getCoupons = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    // Fetch stores and populate their coupons
    const stores = await Store.find({})
      .populate({
        path: 'coupons',
        match: { isValid: true }, // Only fetch valid coupons
        options: { skip: skip, limit: limit } // Apply pagination to coupons
      })
      .skip(skip)
      .limit(limit);

    // Filter out stores with no valid coupons
    const storesWithCoupons = stores.filter(store => store.coupons.length > 0);

    const totalCoupons = await Coupon.countDocuments({ isValid: true });
    const totalStores = await Store.countDocuments();

    // Format the response
    const formattedStores = storesWithCoupons.map(store => ({
      _id: store._id,
      name: store.name,
      image: store.image,
      directUrl: store.directUrl,
      trackingUrl: store.directUrl, // Use directUrl as trackingUrl
      coupons: store.coupons.map(coupon => formatCoupon(coupon)) // Use formatCoupon here
    }));

    res.status(200).json({
      status: 'success',
      data: formattedStores,
      metadata: {
        totalStores: totalStores,
        totalCoupons: totalCoupons,
        currentPage: page,
        storesPerPage: limit,
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

    const updatedCoupon = await Coupon.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate({ path: 'store', select: 'name image directUrl trackingUrl' });

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
    ).populate({ path: 'store', select: 'name image directUrl trackingUrl' });

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

    const coupon = await Coupon.findById(req.params.id)
      .populate({ path: 'store', select: 'name image directUrl trackingUrl' });

    if (!coupon) throw new CustomError('Coupon not found', 404);

    res.status(200).json({ status: 'success', data: formatCoupon(coupon) });
  } catch (error) {
    next(error);
  }
};