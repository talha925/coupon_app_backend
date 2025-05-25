const couponService = require('../services/couponService');

// Get all coupons for a specific store with pagination
exports.getCouponsByStore = async (req, res, next) => {
  try {
    const result = await couponService.getCouponsByStore(req.query, req.params.storeId);

    res.status(200).json({
      status: 'success',
      data: result.coupons,
      metadata: {
        totalCoupons: result.totalCoupons,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all coupons with pagination
exports.getCoupons = async (req, res, next) => {
  try {
    const result = await couponService.getCoupons(req.query);

    res.status(200).json({
      status: 'success',
      data: result.coupons,
      metadata: {
        totalCoupons: result.totalCoupons,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a new coupon
exports.createCoupon = async (req, res, next) => {
  try {
    const newCoupon = await couponService.createCoupon(req.body);
    res.status(201).json({ status: 'success', data: newCoupon });
  } catch (error) {
    next(error);
  }
};

// Update a coupon
exports.updateCoupon = async (req, res, next) => {
  try {
    const updatedCoupon = await couponService.updateCoupon(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: updatedCoupon });
  } catch (error) {
    next(error);
  }
};

// Delete a coupon
exports.deleteCoupon = async (req, res, next) => {
  try {
    await couponService.deleteCoupon(req.params.id);
    res.status(200).json({ status: 'success', message: 'Coupon deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Track URL hits for a coupon
exports.trackCouponUrl = async (req, res, next) => {
  try {
    const coupon = await couponService.trackCouponUsage(req.params.couponId);

    // Log the tracking event
    console.log(`Coupon tracked: ${coupon._id}, Hits: ${coupon.hits}, Last Accessed: ${coupon.lastAccessed}`);

    res.status(200).json({ status: 'success', data: coupon });
  } catch (error) {
    next(error);
  }
};

// Get a coupon by ID
exports.getCouponById = async (req, res, next) => {
  try {
    const coupon = await couponService.getCouponById(req.params.id);
    res.status(200).json({ status: 'success', data: coupon });
  } catch (error) {
    next(error);
  }
};

// Update the coupon order for a specific store
exports.updateCouponOrder = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const { orderedCouponIds } = req.body;

    // Validate request body using Joi schema
    const { error } = require('../validators/couponValidator').updateCouponOrderSchema.validate({ orderedCouponIds });
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    // Call service to update coupon order
    const result = await couponService.updateCouponOrder(storeId, orderedCouponIds);

    // Log the result to see if the order was updated successfully
    console.log('Order Update Result:', result);  // Log the success message and total updates

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
