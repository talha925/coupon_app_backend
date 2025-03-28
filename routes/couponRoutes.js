const express = require('express');
const {
    getCoupons,
    createCoupon,
    getCouponById,
    updateCoupon,
    deleteCoupon,
    trackCouponUrl
} = require('../controllers/couponController');
const validator = require('../middlewares/validator');
const { createCouponSchema, updateCouponSchema } = require('../validators/couponValidator');

const router = express.Router();

// Get all coupons (with pagination and filtering)
router.get('/', getCoupons);

// Create a new coupon with validation
router.post('/', validator(createCouponSchema), createCoupon);

// Get coupon by ID
router.get('/:id', getCouponById);

// Update coupon by ID with validation
router.put('/:id', validator(updateCouponSchema), updateCoupon);

// Delete coupon by ID
router.delete('/:id', deleteCoupon);

// Track coupon usage
router.post('/:couponId/track', trackCouponUrl); 

module.exports = router;
