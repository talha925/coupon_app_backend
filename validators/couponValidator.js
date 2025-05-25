// validators/couponValidator.js
const Joi = require('joi');
const mongoose = require('mongoose');

/**
 * Custom validation for MongoDB ObjectIds
 */
const objectId = Joi.string().custom((value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
    }
    return value;
}, 'MongoDB ObjectId validation');

/**
 * Schema for creating a new coupon
 */
const createCouponSchema = Joi.object({
    offerDetails: Joi.string().required().trim().messages({
        'string.empty': 'Offer details cannot be empty',
        'any.required': 'Offer details are required'
    }),
    store: objectId.required().messages({
        'any.required': 'Store ID is required',
        'any.invalid': 'Store ID must be a valid MongoDB ObjectId'
    }),
    code: Joi.string().trim().allow(null, '').messages({
        'string.base': 'Code must be a string'
    }),
    active: Joi.boolean().default(true),
    isValid: Joi.boolean().default(true),
    featuredForHome: Joi.boolean().default(false),
    expirationDate: Joi.date().allow(null).messages({
        'date.base': 'Expiration date must be a valid date'
    })
});

/**
 * Schema for updating an existing coupon
 */
const updateCouponSchema = Joi.object({
    offerDetails: Joi.string().trim().messages({
        'string.empty': 'Offer details cannot be empty'
    }),
    code: Joi.string().trim().allow(null, '').messages({
        'string.base': 'Code must be a string'
    }),
    active: Joi.boolean(),
    isValid: Joi.boolean(),
    featuredForHome: Joi.boolean(),
    expirationDate: Joi.date().allow(null).messages({
        'date.base': 'Expiration date must be a valid date'
    })
}).min(1).messages({
    'object.min': 'At least one field is required to update'
});

/**
 * Schema for updating coupon order
 */
const updateCouponOrderSchema = Joi.object({
    orderedCouponIds: Joi.array().items(
        Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
            'string.pattern.base': 'Coupon ID must be a valid MongoDB ObjectId'
        })
    ).required().min(1).messages({
        'array.min': 'At least one coupon ID is required',
        'any.required': 'Ordered coupon IDs are required'
    })
});

module.exports = { 
    createCouponSchema,
    updateCouponSchema,
    updateCouponOrderSchema
};