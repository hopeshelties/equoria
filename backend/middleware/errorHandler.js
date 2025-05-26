// middleware/errorHandler.js
import logger from '../utils/logger.js';
import config from '../config/config.js';

export default (err, req, res, next) => {
  // Log the full error with context
  logger.error(`Error in ${req.method} ${req.path}:`, {
    error: err.message,
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Determine error type and response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  // Handle known error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.details || err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource Not Found';
  } else if (err.code === 'P2002') { // Prisma unique constraint
    statusCode = 409;
    message = 'Resource already exists';
  } else if (err.code === 'P2025') { // Prisma record not found
    statusCode = 404;
    message = 'Resource not found';
  }

  // In development, include more error details
  const response = {
    success: false,
    message,
    ...(details && { details }),
    ...(config.env === 'development' && { 
      stack: err.stack,
      originalError: err.message 
    })
  };

  res.status(statusCode).json(response);
}; 