// @ts-nocheck
import Vehicle from './vehicle.model';
import User from '@/modules/users/user.model';
import { ApiError } from '@/lib/api-wrapper';

/**
 * Register a new vehicle in database
 * @param {string} ownerId - Owner user ID
 * @param {object} vehicleData - Vehicle specifications
 * @returns {Promise<object>} Created vehicle document and optionally the updated user
 */
export const createVehicle = async (ownerId, vehicleData) => {
  const vehicle = await Vehicle.create({ owner: ownerId, ...vehicleData });
  const user = await User.findById(ownerId);
  
  if (user && user.role === 'passenger') {
    user.role = 'hybrid';
    await user.save();
    return { vehicle, user };
  }
  
  return { vehicle };
};

/**
 * Retrieve all vehicles owned by a specific user
 * @param {string} ownerId - Owner user ID
 * @returns {Promise<array>} Array of vehicle documents
 */
export const getVehiclesByOwner = async (ownerId) => {
  return await Vehicle.find({ owner: ownerId });
};

/**
 * Update a vehicle (ensuring user owns it)
 * @param {string} vehicleId - Vehicle ID
 * @param {string} userId - User ID (owner verification)
 * @param {object} updateData - Fields to update
 * @returns {Promise<object>} Updated vehicle document
 */
export const updateVehicle = async (vehicleId, userId, updateData) => {
  const vehicle = await Vehicle.findById(vehicleId);
  
  if (!vehicle) {
    throw new ApiError(404, 'Vehicle not found');
  }

  if (vehicle.owner.toString() !== userId) {
    throw new ApiError(403, 'You do not have permission to update this vehicle');
  }

  const updated = await Vehicle.findByIdAndUpdate(vehicleId, updateData, {
    new: true,
    runValidators: true,
  });

  return updated;
};

/**
 * Delete a vehicle (ensuring user owns it)
 * @param {string} vehicleId - Vehicle ID
 * @param {string} userId - User ID (owner verification)
 */
export const deleteVehicle = async (vehicleId, userId) => {
  const vehicle = await Vehicle.findById(vehicleId);
  
  if (!vehicle) {
    throw new ApiError(404, 'Vehicle not found');
  }

  if (vehicle.owner.toString() !== userId) {
    throw new ApiError(403, 'You do not have permission to delete this vehicle');
  }

  await vehicle.deleteOne();
};
