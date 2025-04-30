const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const authController = require('../controllers/authController');

// Get all coupons for a specific store
router.get('/store/:storeId', couponController.getCouponsByStore);

// Get all coupons
router.get('/', couponController.getCoupons);

// Create a new coupon
router.post('/', couponController.createCoupon);

// Get coupon by ID
router.get('/:id', couponController.getCouponById);

// Update coupon by ID
router.put('/:id', couponController.updateCoupon);

// Delete coupon by ID
router.delete('/:id', couponController.deleteCoupon);

// Track coupon usage
router.post('/:couponId/track', couponController.trackCouponUrl);

module.exports = router;
