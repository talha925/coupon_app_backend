const Joi = require('joi');

// Accept any string for URL (no restriction)
const validateUserFacingUrl = (value) => value;

const createStoreSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Store name cannot be empty',
    'any.required': 'Store name is required'
  }),

  trackingUrl: Joi.string().trim().required().custom(validateUserFacingUrl).messages({
    'string.empty': 'Tracking URL cannot be empty',
    'any.required': 'Tracking URL is required'
  }),

  short_description: Joi.string().trim().required().max(160).messages({
    'string.empty': 'Short description cannot be empty',
    'string.max': 'Short description cannot exceed {#limit} characters',
    'any.required': 'Short description is required'
  }),

  long_description: Joi.string().trim().required().messages({
    'string.empty': 'Long description cannot be empty',
    'any.required': 'Long description is required'
  }),

  image: Joi.object({
    url: Joi.string().uri().required().messages({
      'string.uri': 'Image URL must be a valid URL',
      'any.required': 'Image URL is required'
    }),
    alt: Joi.string().trim().required().messages({
      'string.empty': 'Image alt text cannot be empty',
      'any.required': 'Image alt text is required'
    })
  }).required().messages({
    'any.required': 'Image information is required'
  }),

  categories: Joi.array().items(
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
      'string.pattern.base': 'Category ID must be a valid MongoDB ObjectId'
    })
  ),

  seo: Joi.object({
    meta_title: Joi.string().trim().max(60).messages({
      'string.max': 'Meta title cannot exceed {#limit} characters'
    }),
    meta_description: Joi.string().trim().max(160).messages({
      'string.max': 'Meta description cannot exceed {#limit} characters'
    }),
    meta_keywords: Joi.string().trim().max(200).messages({
      'string.max': 'Meta keywords cannot exceed {#limit} characters'
    })
  }).required().messages({
    'any.required': 'SEO information is required'
  }),

  language: Joi.string().trim().default('English'),
  isTopStore: Joi.boolean().default(false),
  isEditorsChoice: Joi.boolean().default(false),

  // ✅ NO RESTRICTION ON HEADING ANYMORE
  heading: Joi.string().trim().optional().default('Coupons & Promo Codes')
});

const updateStoreSchema = Joi.object({
  name: Joi.string().trim().messages({
    'string.empty': 'Store name cannot be empty'
  }),

  trackingUrl: Joi.string().trim().custom(validateUserFacingUrl).messages({
    'string.empty': 'Tracking URL cannot be empty'
  }),

  short_description: Joi.string().trim().max(160).messages({
    'string.max': 'Short description cannot exceed {#limit} characters'
  }),

  long_description: Joi.string().trim(),

  image: Joi.object({
    url: Joi.string().uri().messages({
      'string.uri': 'Image URL must be a valid URL'
    }),
    alt: Joi.string().trim()
  }),

  categories: Joi.array().items(
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
      'string.pattern.base': 'Category ID must be a valid MongoDB ObjectId'
    })
  ),

  seo: Joi.object({
    meta_title: Joi.string().trim().max(60).messages({
      'string.max': 'Meta title cannot exceed {#limit} characters'
    }),
    meta_description: Joi.string().trim().max(160).messages({
      'string.max': 'Meta description cannot exceed {#limit} characters'
    }),
    meta_keywords: Joi.string().trim().max(200).messages({
      'string.max': 'Meta keywords cannot exceed {#limit} characters'
    })
  }),

  language: Joi.string().trim(),
  isTopStore: Joi.boolean(),
  isEditorsChoice: Joi.boolean(),

  // ✅ NO RESTRICTION ON HEADING ANYMORE
  heading: Joi.string().trim()
});

module.exports = {
  createStoreSchema,
  updateStoreSchema
};
