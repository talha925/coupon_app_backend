const express = require('express');
const {
    getCoupons,
    createCoupon,
    getCouponById,
    updateCoupon,
    deleteCoupon,
    trackCouponUrl // ✅ Added trackCouponUrl
} = require('../controllers/couponController');

const router = express.Router();

router.get('/', getCoupons);
router.post('/', createCoupon);
router.get('/:id', getCouponById);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);
router.post('/:couponId/track', trackCouponUrl); 

module.exports = router;
