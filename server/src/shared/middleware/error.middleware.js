import ApiError from '../utils/api-error.js';

/**
 * Express Global Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // Set default code and message if they are not defined
  if (!statusCode) {
    statusCode = err.name === 'ValidationError' ? 400 : 500;
    message = err.message || 'Internal Server Error';
  }

  // Handle Mongoose Cast Error (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field: ${err.path}`;
  }

  // Handle Duplicate Key Error (MongoDB)
  if (err.code === 11000) {
    statusCode = 400;
    const fieldName = Object.keys(err.keyValue)[0];
    message = `Duplicate value error: ${fieldName} already exists`;
  }

  // Handle Zod Validation Errors
  if (err.name === 'ZodError' || err.issues) {
    statusCode = 400;
    message = 'Validation failed';
    return res.status(statusCode).json({
      status: 'error',
      statusCode,
      message,
      errors: err.errors || err.issues,
    });
  }

  const response = {
    status: 'error',
    statusCode,
    message,
    ...(err.code && { code: err.code }),
    ...(err.errors && { errors: err.errors }),
    ...(err.data && { data: err.data }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  // Log error stack trace in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error Middleware] ${err.stack || err}`);
  }

  res.status(statusCode).json(response);
};
