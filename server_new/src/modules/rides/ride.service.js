import Ride from './ride.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import ApiError from '../../shared/utils/api-error.js';
import { recordLocationUsage } from '../users/user.service.js';

/**
 * Build a validated, verified location object from raw input.
 * Throws ApiError if coordinates are missing or verification is missing.
 */
const buildVerifiedLocation = (raw, fieldName) => {
  if (!raw || !Number.isFinite(Number(raw.latitude)) || !Number.isFinite(Number(raw.longitude))) {
    throw new ApiError(
      400,
      `${fieldName} with valid coordinates is required. Please use the address autocomplete and confirm on the map.`
    );
  }
  if (raw.verified !== true) {
    throw new ApiError(
      400,
      `${fieldName} must be confirmed on the map before proceeding. Click "Confirm Location" on the pin.`
    );
  }
  return {
    address:         raw.address || '',
    latitude:        Number(raw.latitude),
    longitude:       Number(raw.longitude),
    verified:        true,
    verifiedAt:      new Date(),
    provider:        raw.provider || null,
    providerPlaceId: raw.providerPlaceId || null,
  };
};

/**
 * Register a new ride offer.
 * pickupLocation and destinationLocation must both be coordinate-verified.
 */
export const createRide = async (rideData) => {
  const vehicle = await Vehicle.findOne({ _id: rideData.vehicle, owner: rideData.driver });
  if (!vehicle) throw new ApiError(403, 'You can only create rides with your own vehicle');
  if (rideData.availableSeats > vehicle.seatCount) {
    throw new ApiError(400, 'Available seats cannot exceed vehicle seat count');
  }

  const pickup = buildVerifiedLocation(rideData.pickupLocation, 'Pickup location');
  const destination = buildVerifiedLocation(rideData.destinationLocation, 'Destination location');

  const finalRideData = {
    ...rideData,
    pickupLocation: pickup,
    destinationLocation: destination,
    source: pickup.address,
    destination: destination.address,
  };

  const ride = await Ride.create(finalRideData);

  // Record usage for frequent/recent address lists (fire-and-forget)
  Promise.all([
    recordLocationUsage(rideData.driver, pickup),
    recordLocationUsage(rideData.driver, destination),
  ]).catch((err) => console.warn('[RIDE] recordLocationUsage error:', err.message));

  return ride;
};

export const getRideById = async (id) => {
  const ride = await Ride.findById(id)
    .populate('driver', 'firstName lastName profileImage averageRating phone')
    .populate('vehicle');
  if (!ride) throw new ApiError(404, 'Ride not found');
  return ride;
};

export const getRides = async (filters = {}) => {
  const query = {};

  // Coordinate-based proximity matching (5 km radius) for pickup
  if (filters.sourceLat && filters.sourceLng) {
    const lat = Number(filters.sourceLat);
    const lng = Number(filters.sourceLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const maxDeg = 5 / 111.12; // ~5 km in degrees
      query['pickupLocation.latitude']  = { $gte: lat - maxDeg, $lte: lat + maxDeg };
      query['pickupLocation.longitude'] = { $gte: lng - maxDeg, $lte: lng + maxDeg };
    }
  } else if (filters.source) {
    query.source = { $regex: filters.source, $options: 'i' };
  }

  // Coordinate-based proximity matching for destination
  if (filters.destLat && filters.destLng) {
    const lat = Number(filters.destLat);
    const lng = Number(filters.destLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const maxDeg = 5 / 111.12;
      query['destinationLocation.latitude']  = { $gte: lat - maxDeg, $lte: lat + maxDeg };
      query['destinationLocation.longitude'] = { $gte: lng - maxDeg, $lte: lng + maxDeg };
    }
  } else if (filters.destination) {
    query.destination = { $regex: filters.destination, $options: 'i' };
  }

  if (filters.date) {
    const date = new Date(filters.date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    query.departureTime = { $gte: date, $lt: nextDay };
  }

  query.status = { $in: ['pending', 'active'] };
  query.availableSeats = { $gte: Number(filters.seats) || 1 };

  return await Ride.find(query)
    .populate('driver', 'firstName lastName profileImage averageRating')
    .populate('vehicle')
    .sort({ departureTime: 1 });
};

export const getRidesByDriver = async (driverId) => {
  return await Ride.find({ driver: driverId })
    .populate('vehicle')
    .sort({ createdAt: -1 });
};

export const updateRideStatus = async (id, driverId, status) => {
  const ride = await Ride.findOne({ _id: id, driver: driverId });
  if (!ride) throw new ApiError(404, 'Ride not found or unauthorized');
  const allowed = ['pending', 'active', 'completed', 'cancelled'];
  if (!allowed.includes(status)) throw new ApiError(400, 'Invalid status');
  ride.status = status;
  await ride.save();
  return ride;
};
