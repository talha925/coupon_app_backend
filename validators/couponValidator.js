// validators/couponValidator.js
const Joi = require('joi');

const createCouponSchema = Joi.object({
  offerDetails: Joi.string().required(),
  store: Joi.string().required(),
  code: Joi.string().allow(null),
  active: Joi.boolean().default(true),
  featuredForHome: Joi.boolean().default(false),
  expirationDate: Joi.date().allow(null),
});

module.exports = { createCouponSchema };