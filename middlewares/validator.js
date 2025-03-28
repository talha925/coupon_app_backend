const AppError = require('../errors/AppError');

/**
 * Validator middleware factory
 * @param {Object} schema - Joi schema to validate against
 * @param {String} source - Request property to validate (body, params, query)
 * @returns {Function} Express middleware
 */
const validator = (schema, source = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: source !== 'body' // Allow unknown fields in params/query, not in body
        });

        if (error) {
            const errorMessage = error.details
                .map(detail => detail.message)
                .join(', ');

            return next(new AppError(errorMessage, 400));
        }

        // Replace request data with validated data
        req[source] = value;
        next();
    };
};

module.exports = validator; 