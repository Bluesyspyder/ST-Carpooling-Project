import Vehicle from './vehicle.model.js';

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
