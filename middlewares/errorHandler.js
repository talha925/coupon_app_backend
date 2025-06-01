// middleware/errorHandler.js
const { ERROR_MESSAGES } = require('../constants');
const AppError = require('../errors/AppError');

/**
 * Development error handler - shows detailed error information
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

/**
 * Production error handler - shows limited error information
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } 
  // Programming or unknown error: don't leak error details
  else {
    // Log error
    console.error('ERROR 💥', err);
    
    // Send generic message
    res.status(500).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose duplicate key errors
 */
const handleDuplicateFieldsError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${value} for field ${field}. Please use another value.`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose invalid ID errors
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

/**
 * Handle JWT expiration errors
 */
const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', 401);
};

/**
 * Handle blog-specific errors
 */
const handleBlogErrors = (err) => {
  if (err.code === 11000 && err.keyPattern?.slug) {
    return new AppError('A blog post with this title already exists', 400);
  }
  return err;
};

/**
 * Main error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Default status code and status
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Console log for debugging
  console.error('Error:', err);

  // Different handling for development and production
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    
    // Mongoose validation error
    if (err.name === 'ValidationError') error = handleValidationError(err);
    
    // Mongoose duplicate key error
    if (err.code === 11000) error = handleDuplicateFieldsError(err);
    
    // Mongoose bad ObjectId
    if (err.name === 'CastError') error = handleCastError(err);
    
    // JWT validation error
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    
    // JWT expired error
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
    
    // Blog-specific errors
    if (err.name === 'MongoServerError') error = handleBlogErrors(err);
    
    sendErrorProd(error, res);
  }
};

module.exports = errorHandler;