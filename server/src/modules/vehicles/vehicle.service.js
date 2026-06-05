import Vehicle from './vehicle.model.js';
import ApiError from '../../shared/utils/api-error.js';

/**
 * Register a new vehicle in database
 * @param {object} vehicleData - Vehicle specifications
 * @returns {Promise<object>} Created vehicle document
 */
export const createVehicle = async (vehicleData) => {
  return await Vehicle.create(vehicleData);
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
