// utils/couponUtils.js
const formatCoupon = (coupon) => {
  const storeObj = coupon.store && typeof coupon.store === 'object' && coupon.store._id
    ? {
        _id: coupon.store._id,
        name: coupon.store.name,
        image: coupon.store.image,
        trackingUrl: coupon.store.trackingUrl,
      }
    : null;

  return {
    _id: coupon._id,
    offerDetails: coupon.offerDetails,
    code: coupon.code,
    active: coupon.active,
    isValid: coupon.isValid,
    store: storeObj,
    storeId: storeObj ? storeObj._id : coupon.store,
    featuredForHome: coupon.featuredForHome,
    hits: coupon.hits,
    lastAccessed: coupon.lastAccessed,
    expirationDate: coupon.expirationDate,
  };
};

module.exports = { formatCoupon };