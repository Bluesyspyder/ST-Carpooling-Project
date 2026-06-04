import User from './user.model.js';
import ApiError from '../../shared/utils/api-error.js';

/**
 * Find user by MongoDB ObjectId
 * @param {string} id - User ID
 * @returns {Promise<object>} User document
 */
export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};

/**
 * Update user details
 * @param {string} id - User ID
 * @param {object} updateData - Fields to update
 * @returns {Promise<object>} Updated user document
 */
export const updateUser = async (id, updateData) => {
  // Prevent updating sensitive fields directly
  delete updateData.password;
  delete updateData.email;
  delete updateData.role;

  const user = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};
