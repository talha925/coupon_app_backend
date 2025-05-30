const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'MongoDB ObjectId validation');

const createCouponSchema = Joi.object({
  offerDetails: Joi.string().required().trim(),
  store: objectId.required(),
  code: Joi.string().trim().allow(null, ''),
  active: Joi.boolean().default(true),
  isValid: Joi.boolean().default(true),
  featuredForHome: Joi.boolean().default(false),
  expirationDate: Joi.date().allow(null),
});

const updateCouponSchema = Joi.object({
  offerDetails: Joi.string().trim(),
  code: Joi.string().trim().allow(null, ''),
  active: Joi.boolean(),
  isValid: Joi.boolean(),
  featuredForHome: Joi.boolean(),
  expirationDate: Joi.date().allow(null),
}).min(1);

const updateCouponOrderSchema = Joi.object({
  orderedCouponIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .required()
    .min(1),
});

module.exports = {
  createCouponSchema,
  updateCouponSchema,
  updateCouponOrderSchema,
};
