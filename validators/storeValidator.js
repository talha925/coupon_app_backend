const { body } = require('express-validator');

exports.validateStore = [
    body('name')
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    
    body('website')
        .notEmpty().withMessage('Website is required')
        .isURL().withMessage('Website must be a valid URL'),
    
    body('description')
        .notEmpty().withMessage('Description is required')
        .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

    body('image')
        .notEmpty().withMessage('Image URL is required')
        .isURL().withMessage('Image must be a valid URL'),

    body('seo.meta_title').optional().isLength({ max: 60 }).withMessage('Meta title cannot exceed 60 characters'),
    body('seo.meta_description').optional().isLength({ max: 160 }).withMessage('Meta description cannot exceed 160 characters'),
    body('seo.meta_keywords').optional().isLength({ max: 200 }).withMessage('Meta keywords cannot exceed 200 characters'),

    body('categories')
        .isArray({ min: 1 }).withMessage('Categories should be an array with at least one ID')
        .custom((categories) => categories.every(id => mongoose.isValidObjectId(id))).withMessage('Invalid category ID'),

    body('language').optional().isIn(['English', 'Spanish', 'French']).withMessage('Invalid language'),

    body('top_store').optional().isBoolean().withMessage('Top store must be a boolean'),
    body('editors_choice').optional().isBoolean().withMessage('Editor\'s choice must be a boolean'),
];
