import User from '../users/user.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import ApiError from '../../shared/utils/api-error.js';
import { signToken } from '../../config/jwt.js';
import { sendOtpEmail } from '../../shared/services/mail.service.js';

/**
 * Generate a 4-digit OTP
 */
const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

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

  const {
    vehicleName,
    vehiclePlateNumber,
    vehicleType,
    mileage,
    seatCount,
    vehicleImage,
    ...userFields
  } = userData;

  const user = await User.create(userFields);
  
  // Automatically create a Vehicle document if role is driver (Car Owner)
  if (user.role === 'driver') {
    try {
      await Vehicle.create({
        owner: user._id,
        vehicleName,
        vehiclePlateNumber,
        seatCount,
        vehicleType,
        mileage,
        vehicleImage,
      });
    } catch (error) {
      await User.findByIdAndDelete(user._id);
      throw error;
    }
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

/**
 * Initiate forgot password process by sending OTP
 * @param {string} email - User email
 * @returns {Promise<object>} Message confirming OTP sent
 */
export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new ApiError(404, 'No account found with this email address');
  }

  // Generate OTP and set expiry (10 minutes)
  const otp = generateOtp();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  // Update user with OTP
  user.resetOtp = otp;
  user.resetOtpExpiry = otpExpiry;
  await user.save();

  // Send OTP via email
  try {
    await sendOtpEmail(email, otp, user.firstName);
  } catch (error) {
    // Clear OTP if email fails to send
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();
    throw new ApiError(500, 'Failed to send OTP. Please try again.');
  }

  return {
    message: 'OTP has been sent to your email address',
    email: email,
  };
};

/**
 * Verify OTP for password reset
 * @param {string} email - User email
 * @param {string} otp - OTP provided by user
 * @returns {Promise<object>} Verification status
 */
export const verifyOtp = async (email, otp) => {
  const user = await User.findOne({ email }).select('+resetOtp +resetOtpExpiry');
  
  if (!user) {
    throw new ApiError(404, 'No account found with this email address');
  }

  // Check if OTP exists and hasn't expired
  if (!user.resetOtp || !user.resetOtpExpiry) {
    throw new ApiError(400, 'OTP request not found. Please request a new OTP.');
  }

  if (new Date() > user.resetOtpExpiry) {
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  // Verify OTP
  if (user.resetOtp !== otp) {
    throw new ApiError(400, 'Invalid OTP. Please try again.');
  }

  return {
    message: 'OTP verified successfully',
    verified: true,
  };
};

/**
 * Reset password after OTP verification
 * @param {string} email - User email
 * @param {string} otp - OTP provided by user
 * @param {string} newPassword - New password
 * @returns {Promise<object>} Success message
 */
export const resetPassword = async (email, otp, newPassword) => {
  const user = await User.findOne({ email }).select('+resetOtp +resetOtpExpiry');
  
  if (!user) {
    throw new ApiError(404, 'No account found with this email address');
  }

  // Verify OTP again before resetting password
  if (!user.resetOtp || user.resetOtp !== otp) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  if (new Date() > user.resetOtpExpiry) {
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  // Update password
  user.password = newPassword;
  user.resetOtp = null;
  user.resetOtpExpiry = null;
  await user.save();

  return {
    message: 'Password has been reset successfully',
  };
};
