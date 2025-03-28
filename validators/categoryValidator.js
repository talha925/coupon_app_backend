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
 * Schema for creating a new category
 */
const createCategorySchema = Joi.object({
    name: Joi.string().required().trim().max(50).messages({
        'string.empty': 'Category name cannot be empty',
        'string.max': 'Category name cannot exceed {#limit} characters',
        'any.required': 'Category name is required'
    }),
    description: Joi.string().trim().allow('').max(200).messages({
        'string.max': 'Description cannot exceed {#limit} characters'
    }),
    icon: Joi.string().trim().uri().allow('').messages({
        'string.uri': 'Icon must be a valid URL'
    }),
    active: Joi.boolean().default(true),
    order: Joi.number().integer().min(0).default(0).messages({
        'number.base': 'Order must be a number',
        'number.integer': 'Order must be an integer',
        'number.min': 'Order must be at least {#limit}'
    })
});

/**
 * Schema for updating an existing category
 */
const updateCategorySchema = Joi.object({
    name: Joi.string().trim().max(50).messages({
        'string.empty': 'Category name cannot be empty',
        'string.max': 'Category name cannot exceed {#limit} characters'
    }),
    description: Joi.string().trim().allow('').max(200).messages({
        'string.max': 'Description cannot exceed {#limit} characters'
    }),
    icon: Joi.string().trim().uri().allow('').messages({
        'string.uri': 'Icon must be a valid URL'
    }),
    active: Joi.boolean(),
    order: Joi.number().integer().min(0).messages({
        'number.base': 'Order must be a number',
        'number.integer': 'Order must be an integer',
        'number.min': 'Order must be at least {#limit}'
    })
}).min(1).messages({
    'object.min': 'At least one field is required to update'
});

module.exports = {
    createCategorySchema,
    updateCategorySchema
}; 