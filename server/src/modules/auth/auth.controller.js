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
