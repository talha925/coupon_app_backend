const express = require('express');
const {
    getCoupons,
    createCoupon,
    getCouponById,
    updateCoupon,
    deleteCoupon
} = require('../controllers/couponController');
const router = express.Router();

router.get('/', getCoupons);
router.post('/', createCoupon);
router.get('/:id', getCouponById);
router.put('/:id', updateCoupon); // Update route
router.delete('/:id', deleteCoupon); // Delete route

module.exports = router;
