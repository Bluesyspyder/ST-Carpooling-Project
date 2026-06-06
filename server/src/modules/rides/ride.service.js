import Ride from './ride.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import ApiError from '../../shared/utils/api-error.js';

/**
 * Register a new ride offer
 * @param {object} rideData - Ride details
 * @returns {Promise<object>} Created ride document
 */
export const createRide = async (rideData) => {
  const vehicle = await Vehicle.findOne({
    _id: rideData.vehicle,
    owner: rideData.driver,
  });

  if (!vehicle) {
    throw new ApiError(403, 'You can only create rides with your own vehicle');
  }

  if (rideData.availableSeats > vehicle.seatCount) {
    throw new ApiError(400, 'Available seats cannot exceed vehicle seat count');
  }

  return await Ride.create(rideData);
};

/**
 * Query rides matching search criteria
 * @param {object} criteria - Search parameters
 * @returns {Promise<array>} Array of matching ride documents
 */
export const queryRides = async ({ source, destination, departureDate }) => {
  const query = {};
  
  if (source) {
    query.source = { $regex: source, $options: 'i' };
  }
  
  if (destination) {
    query.destination = { $regex: destination, $options: 'i' };
  }
  
  if (departureDate) {
    const startOfDay = new Date(departureDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(departureDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    query.departureTime = {
      $gte: startOfDay,
      $lte: endOfDay
    };
  }
  
  // Return matching rides with driver and vehicle populated
  return await Ride.find(query)
    .populate('driver', 'firstName lastName profileImage averageRating')
    .populate('vehicle');
};

/**
 * Retrieve ride details by ID
 * @param {string} id - Ride ObjectId
 * @returns {Promise<object>} Ride document with driver and vehicle information
 */
export const getRideById = async (id) => {
  const ride = await Ride.findById(id)
    .populate('driver', 'firstName lastName email phone profileImage averageRating')
    .populate('vehicle');
    
  if (!ride) {
    throw new ApiError(404, 'Ride not found');
  }
  
  return ride;
};
