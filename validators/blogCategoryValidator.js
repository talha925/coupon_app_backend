const Joi = require('joi');

exports.createBlogCategorySchema = Joi.object({
    name: Joi.string()
        .required()
        .trim()
        .min(2)
        .max(50)
        .messages({
            'string.empty': 'Category name is required',
            'string.min': 'Category name must be at least {#limit} characters long',
            'string.max': 'Category name cannot exceed {#limit} characters',
            'any.required': 'Category name is required'
        })
});

exports.updateBlogCategorySchema = Joi.object({
    name: Joi.string()
        .required()
        .trim()
        .min(2)
        .max(50)
        .messages({
            'string.empty': 'Category name is required',
            'string.min': 'Category name must be at least {#limit} characters long',
            'string.max': 'Category name cannot exceed {#limit} characters',
            'any.required': 'Category name is required'
        })
});
