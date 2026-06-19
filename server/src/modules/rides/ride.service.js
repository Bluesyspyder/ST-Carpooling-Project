import Ride from './ride.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import User from '../users/user.model.js';
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
  const vehicle = await Vehicle.findOne({ _id: rideData.driverVehicle, owner: rideData.driver });
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
    rideStatus: 'ACTIVE',
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
    .populate('driverVehicle');
  if (!ride) throw new ApiError(404, 'Ride not found');
  return ride;
};

export const getRides = async (filters = {}) => {
  const query = {};

  // Default to ACTIVE rides only
  query.rideStatus = 'ACTIVE';

  if (filters.journeyDate) {
    const date = new Date(filters.journeyDate);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    query.journeyDate = { $gte: date, $lt: nextDay };
  }

  if (filters.pickupArea) {
    query['pickupLocation.address'] = { $regex: filters.pickupArea, $options: 'i' };
  }

  if (filters.seats) {
    query.availableSeats = { $gte: Number(filters.seats) };
  }

  // Driver Name search
  if (filters.driverName) {
    const driverRegex = new RegExp(filters.driverName, 'i');
    const matchingDrivers = await User.find({
      $or: [{ firstName: driverRegex }, { lastName: driverRegex }]
    }).select('_id');
    const driverIds = matchingDrivers.map(d => d._id);
    if (driverIds.length > 0) {
      query.driver = { $in: driverIds };
    } else {
      // Force empty result if no driver matched
      return [];
    }
  }

  return await Ride.find(query)
    .populate('driver', 'firstName lastName profileImage averageRating')
    .populate('driverVehicle')
    .sort({ journeyDate: 1, journeyTime: 1 });
};

export const getRidesByDriver = async (driverId) => {
  return await Ride.find({ driver: driverId })
    .populate('driverVehicle')
    .sort({ createdAt: -1 });
};

export const updateRideStatus = async (id, driverId, status) => {
  const ride = await Ride.findOne({ _id: id, driver: driverId });
  if (!ride) throw new ApiError(404, 'Ride not found or unauthorized');
  const allowed = ['ACTIVE', 'FULL', 'CANCELLED', 'COMPLETED'];
  if (!allowed.includes(status)) throw new ApiError(400, 'Invalid status');
  ride.rideStatus = status;
  await ride.save();
  return ride;
};
