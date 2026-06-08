import Ride from './ride.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import ApiError from '../../shared/utils/api-error.js';
import { geocodeAddressWithFallback } from '../locations/geocoding.service.js';

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

  // Resolve pickup location
  let pickup;
  if (
    rideData.pickupLocation &&
    Number.isFinite(rideData.pickupLocation.latitude) &&
    Number.isFinite(rideData.pickupLocation.longitude) &&
    (rideData.pickupLocation.confirmed || rideData.pickupLocation.manual)
  ) {
    pickup = {
      address: rideData.pickupLocation.address || rideData.source,
      latitude: rideData.pickupLocation.latitude,
      longitude: rideData.pickupLocation.longitude,
      geocodingFallbackLevel: rideData.pickupLocation.geocodingFallbackLevel || 'User Confirmed',
      geocodingVerified: rideData.pickupLocation.geocodingVerified !== undefined ? rideData.pickupLocation.geocodingVerified : true,
    };
  } else {
    const geocoded = await geocodeAddressWithFallback(rideData.source);
    if (!geocoded) {
      const error = new ApiError(400, 'Geocoding failed for pickup address. Please select location manually.');
      error.code = 'GEOCODING_FAILED';
      error.data = { field: 'source', address: rideData.source };
      throw error;
    }
    if (!geocoded.geocodingVerified && (!rideData.pickupLocation || !rideData.pickupLocation.confirmed)) {
      const error = new ApiError(400, 'Low confidence result for pickup address. Please confirm.');
      error.code = 'GEOCODING_LOW_CONFIDENCE';
      error.data = { field: 'source', location: geocoded };
      throw error;
    }
    pickup = geocoded;
  }

  // Resolve destination location
  let destination;
  if (
    rideData.destinationLocation &&
    Number.isFinite(rideData.destinationLocation.latitude) &&
    Number.isFinite(rideData.destinationLocation.longitude) &&
    (rideData.destinationLocation.confirmed || rideData.destinationLocation.manual)
  ) {
    destination = {
      address: rideData.destinationLocation.address || rideData.destination,
      latitude: rideData.destinationLocation.latitude,
      longitude: rideData.destinationLocation.longitude,
      geocodingFallbackLevel: rideData.destinationLocation.geocodingFallbackLevel || 'User Confirmed',
      geocodingVerified: rideData.destinationLocation.geocodingVerified !== undefined ? rideData.destinationLocation.geocodingVerified : true,
    };
  } else {
    const geocoded = await geocodeAddressWithFallback(rideData.destination);
    if (!geocoded) {
      const error = new ApiError(400, 'Geocoding failed for destination address. Please select location manually.');
      error.code = 'GEOCODING_FAILED';
      error.data = { field: 'destination', address: rideData.destination };
      throw error;
    }
    if (!geocoded.geocodingVerified && (!rideData.destinationLocation || !rideData.destinationLocation.confirmed)) {
      const error = new ApiError(400, 'Low confidence result for destination address. Please confirm.');
      error.code = 'GEOCODING_LOW_CONFIDENCE';
      error.data = { field: 'destination', location: geocoded };
      throw error;
    }
    destination = geocoded;
  }

  // Setup normalized ride data with coords and backward compatible source/destination strings
  const finalRideData = {
    ...rideData,
    pickupLocation: pickup,
    destinationLocation: destination,
    source: pickup.address,
    destination: destination.address,
  };

  return await Ride.create(finalRideData);
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
