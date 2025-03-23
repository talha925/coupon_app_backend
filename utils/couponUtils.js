// utils/couponUtils.js
const formatCoupon = (coupon) => {
  return {
    _id: coupon._id, // Include coupon ID
    offerDetails: coupon.offerDetails,
    code: coupon.code,
    active: coupon.active,
    isValid: coupon.isValid,
    store: {
      _id: coupon.store._id,
      name: coupon.store.name,
      image: coupon.store.image,
      directUrl: coupon.store.directUrl,
      trackingUrl: coupon.store.trackingUrl,
    },
    featuredForHome: coupon.featuredForHome,
    hits: coupon.hits,
    lastAccessed: coupon.lastAccessed,
    expirationDate: coupon.expirationDate,
  };
};

module.exports = { formatCoupon };