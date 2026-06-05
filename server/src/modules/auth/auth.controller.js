import * as authService from './auth.service.js';

/**
 * Handle user registration request
 */
export const register = async (req, res, next) => {
  try {
    const { user, token } = await authService.register(req.body);
    return res.status(201).json({
      status: 'success',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user login request
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);
    return res.status(200).json({
      status: 'success',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle forgot password request
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle OTP verification
 */
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyOtp(email, otp);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle password reset
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const result = await authService.resetPassword(email, otp, newPassword);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
