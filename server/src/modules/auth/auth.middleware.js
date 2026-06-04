import { verifyToken } from '../../config/jwt.js';
import User from '../users/user.model.js';
import ApiError from '../../shared/utils/api-error.js';

/**
 * Protect middleware: intercept requests and authenticate via JWT Bearer Token
 */
export const protect = async (req, res, next) => {
  try {
    let token;
    
    // Check Authorization header for Bearer prefix
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'You are not logged in. Please login to proceed.');
    }

    // Verify token validity
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      throw new ApiError(401, 'Invalid or expired authentication token. Please login again.');
    }

    // Retrieve active user record
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'The user associated with this credentials no longer exists.');
    }

    // Attach user profile to request context
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict routes to specific user roles
 * @param {...string} roles - Approved roles
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access Denied: Unauthorized role credentials.'));
    }
    next();
  };
};
