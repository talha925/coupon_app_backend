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

// Update coupon order for a store
router.put('/store/:storeId/order', couponController.updateCouponOrder);


module.exports = router;
