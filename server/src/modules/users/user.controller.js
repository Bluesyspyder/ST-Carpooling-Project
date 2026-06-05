import * as userService from './user.service.js';
import ApiError from '../../shared/utils/api-error.js';

/**
 * Get current user profile controller
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id);
    return res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile controller
 */
export const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.user.id, req.body);
    return res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload profile image controller
 */
export const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.fileBase64) {
      throw new ApiError(400, 'No image file provided');
    }

    const user = await userService.updateUser(req.user.id, {
      profileImage: req.fileBase64,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Profile image uploaded successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
