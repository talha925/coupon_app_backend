/**
 * Wraps an async function and catches any errors, passing them to Express error handler
 */
exports.catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Creates a standardized error response
 */
exports.createErrorResponse = (message, statusCode = 500) => {
  return {
    success: false,
    message,
    statusCode
  };
};

/**
 * Formats validation errors from Joi
 */
exports.formatValidationErrors = (error) => {
  if (!error.details) return 'Validation error';
  
  return error.details
    .map(detail => detail.message)
    .join(', ');
};
