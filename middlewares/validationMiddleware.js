const { check, validationResult } = require('express-validator');

// Validation rules
const validateStore = [
    check('name').notEmpty().withMessage('Store name is required'),
    check('website').isURL().withMessage('Valid website URL is required'),
    check('description').notEmpty().withMessage('Description is required'),
    
    // Optional SEO fields
    check('seo.meta_title').optional().isString().withMessage('Meta title must be a string'),
    check('seo.meta_description').optional().isString().withMessage('Meta description must be a string'),
    check('seo.meta_keywords').optional().isString().withMessage('Meta keywords must be a string'),
    
    // Add more validation rules as needed...
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    validateStore,
    handleValidationErrors
};
