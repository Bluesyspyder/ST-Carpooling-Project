// @ts-nocheck
import crypto from 'crypto';
import User from '../users/user.model';
import Vehicle from '../vehicles/vehicle.model';
import { ApiError } from '@/lib/api-wrapper';
import { signToken } from '@/lib/jwt';
import { sendOtpEmail, sendVerificationEmail } from '../../shared/services/mail.service';

/**
 * Generate a 4-digit OTP
 */
const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

/**
 * Generate a secure URL-safe random token (48 hex chars)
 */
const generateSecureToken = () => crypto.randomBytes(24).toString('hex');

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

  // Generate email verification token
  const verificationToken = generateSecureToken();
  const verificationExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

  const user = await User.create({
    ...userFields,
    isEmailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationExpiry: verificationExpiry,
  });

  // Automatically create a Vehicle document if the user can offer rides.
  if (user.role === 'hybrid') {
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

  // Send verification email (non-blocking — don't fail registration if email fails)
  try {
    await sendVerificationEmail(user.email, user.firstName, verificationToken);
  } catch (emailError) {
    console.error('[AUTH] Failed to send verification email during register:', emailError);
    // Still allow registration — user can resend via /check-email
  }

  // Convert document to plain JS object and strip sensitive fields
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.emailVerificationToken;
  delete userObj.emailVerificationExpiry;

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
  const normalizedEmail = email.trim().toLowerCase();

  // Retrieve user with password and verification status
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Block login for unverified accounts
  // Note: existing accounts without isEmailVerified set (null/undefined) are treated as verified
  if (user.isEmailVerified === false) {
    throw new ApiError(403, 'Please verify your email before logging in. Check your inbox or request a new verification email.');
  }

  // Convert document and strip sensitive fields
  const userObj = user.toObject();
  delete userObj.password;

  const token = signToken({ id: user._id, role: user.role });

  return { user: userObj, token };
};

/**
 * Verify a user's email using the token from the verification link
 * @param {string} token - Verification token from email link
 * @returns {Promise<object>} Success message
 */
export const verifyEmail = async (token) => {
  if (!token) {
    throw new ApiError(400, 'Verification token is required');
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpiry: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpiry');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired verification link. Please request a new one.');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpiry = null;
  await user.save();

  return { message: 'Email verified successfully. You can now log in.' };
};

/**
 * Resend a verification email
 * @param {string} email - User email
 * @returns {Promise<object>} Success message
 */
export const resendVerification = async (email) => {
  const user = await User.findOne({ email: email.trim().toLowerCase() })
    .select('+emailVerificationToken +emailVerificationExpiry');

  if (!user) {
    // Return success regardless to prevent email enumeration
    return { message: 'If an account exists with this email, a verification link has been sent.' };
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, 'This email is already verified. Please log in.');
  }

  // Generate fresh token
  const verificationToken = generateSecureToken();
  const verificationExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpiry = verificationExpiry;
  await user.save();

  try {
    await sendVerificationEmail(user.email, user.firstName, verificationToken);
  } catch (emailError) {
    console.error('[AUTH] Failed to resend verification email:', emailError);
    throw new ApiError(500, 'Failed to send verification email. Please try again.');
  }

  return { message: 'Verification email sent. Please check your inbox.' };
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

  user.resetOtp = otp;
  user.resetOtpExpiry = otpExpiry;
  await user.save();

  try {
    await sendOtpEmail(email, otp, user.firstName);
  } catch (error) {
    console.error('[AUTH] Failed to dispatch OTP email:', error);
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

  if (!user.resetOtp || !user.resetOtpExpiry) {
    throw new ApiError(400, 'OTP request not found. Please request a new OTP.');
  }

  if (new Date() > user.resetOtpExpiry) {
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  if (user.resetOtp !== otp) {
    throw new ApiError(400, 'Invalid OTP. Please try again.');
  }

  return { message: 'OTP verified successfully', verified: true };
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

  if (!user.resetOtp || user.resetOtp !== otp) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  if (new Date() > user.resetOtpExpiry) {
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  user.password = newPassword;
  user.resetOtp = null;
  user.resetOtpExpiry = null;
  await user.save();

  return { message: 'Password has been reset successfully' };
};
