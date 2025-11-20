const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Coupon = require('../models/couponModel');
const Store = require('../models/storeModel');
const couponService = require('../services/couponService');

async function run() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: 'test-db' });

  const store = await Store.create({
    name: 'Test Store',
    trackingUrl: 'https://example.com',
    short_description: 'Short',
    long_description: 'Long',
    image: { url: 'https://example.com/img.png', alt: 'img' }
  });

  const c1 = await Coupon.create({
    offerDetails: 'Offer A',
    store: store._id,
    active: true,
    isValid: true,
    order: 1
  });
  const c2 = await Coupon.create({
    offerDetails: 'Offer B',
    store: store._id,
    active: true,
    isValid: true,
    order: 0
  });

  const byStore = await couponService.getCouponsByStore({ page: 1, isValid: 'true' }, store._id.toString());
  console.log('ByStore count:', byStore.totalCoupons);
  console.log('ByStore order:', byStore.coupons.map(c => c.order));

  const general = await couponService.getCoupons({ page: 1, limit: 10, isValid: 'true', store: store._id.toString() });
  console.log('General count:', general.totalCoupons);
  console.log('General order:', general.coupons.map(c => c.order));

  const updated = await couponService.updateCoupon(c2._id.toString(), { active: false, code: '' });
  console.log('Updated coupon active:', updated.coupon.active, 'code:', updated.coupon.code);

  await mongoose.disconnect();
  await mongod.stop();
}

run().catch(err => { console.error('Test failed:', err); process.exit(1); });