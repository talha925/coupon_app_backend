// middlewares/validationMiddleware.js
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(', '),
    });
  }
  next();
};

module.exports = validate; // Default export
