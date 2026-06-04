import User from '../users/user.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import ApiError from '../../shared/utils/api-error.js';
import { signToken } from '../../config/jwt.js';

/**
 * Register a new user
 * @param {object} userData - User register parameters
 * @returns {Promise<object>} Registered user info & signed token
 */
export const register = async (userData) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new ApiError(400, 'Email is already registered');
  }

  const user = await User.create(userData);
  
  // Automatically create a Vehicle document if role is driver (Car Owner)
  if (user.role === 'driver') {
    await Vehicle.create({
      owner: user._id,
      make: userData.vehicleName,
      model: userData.vehicleName,
      year: new Date().getFullYear(),
      registrationNumber: userData.vehiclePlateNumber,
      seatCount: 4, // Default seats
      type: userData.vehicleType,
      mileage: userData.mileage,
    });
  }
  
  // Convert document to plain JS object and strip sensitive fields
  const userObj = user.toObject();
  delete userObj.password;

  const token = signToken({ id: user._id, role: user.role });
  
  return { user: userObj, token };
};

/**
 * Log in an existing user
 * @param {string} email - User email
 * @param {string} password - Raw candidate password
 * @returns {Promise<object>} Logged in user info & signed token
 */
export const login = async (email, password) => {
  // Retrieve user with password field explicitly selected
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Convert document and strip sensitive fields
  const userObj = user.toObject();
  delete userObj.password;

  const token = signToken({ id: user._id, role: user.role });

  return { user: userObj, token };
};
