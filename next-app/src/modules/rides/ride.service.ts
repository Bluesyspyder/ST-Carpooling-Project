// @ts-nocheck
import Ride from './ride.model';
import Vehicle from '../vehicles/vehicle.model';
import User from '../users/user.model';
import Booking from '../bookings/booking.model';
import { ApiError } from '@/lib/api-wrapper';
import { recordLocationUsage } from '../users/user.service';
import { emitToUser } from '@/socket/socketHandler';

const EARTH_RADIUS_KM = 6371;

// ── Eco-credit / emissions constants, keyed by Vehicle.vehicleType ──
const EMISSION_FACTORS_KG_PER_KM = { petrol: 0.192, diesel: 0.171, ev: 0.001 };
const PASSENGER_CREDITS_PER_KM = 1.2;
const DRIVER_BASE_CREDITS = 5;
const DRIVER_FUEL_CREDITS = { petrol: 1, diesel: 0.8, ev: 1.8 };

// Ride lifecycle transitions allowed from each current status.
const ALLOWED_TRANSITIONS = {
  ACTIVE: ['FROZEN', 'CANCELLED', 'COMPLETED'],
  FULL: ['FROZEN', 'CANCELLED', 'COMPLETED'],
  FROZEN: ['IN_PROGRESS', 'CANCELLED', 'COMPLETED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [],
  COMPLETED: [],
};

/**
 * Great-circle distance between two lat/lng points, in kilometers.
 * Used for true radius-based ride matching (replaces the old bounding-box-only filter).
 */
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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
    routeDistance: rideData.routeDistance ?? haversineKm(
      pickup.latitude, pickup.longitude,
      destination.latitude, destination.longitude
    ),
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

  // Radius-based pickup matching. The requested radius (default 10km, capped at 50km)
  // drives a coarse lat/lng bounding box (cheap, index-friendly pre-filter), and the
  // exact haversine distance is then computed per-candidate below to enforce a true
  // circular radius rather than a lopsided box.
  const radiusKm = Math.min(Number(filters.radiusKm) || 10, 50);
  let pickupLat = null;
  let pickupLng = null;

  if (filters.pickupLat && filters.pickupLng) {
    pickupLat = Number(filters.pickupLat);
    pickupLng = Number(filters.pickupLng);
    const latDelta = radiusKm / 111; // ~111km per degree latitude
    const lngDelta = radiusKm / (111 * Math.cos(pickupLat * (Math.PI / 180)));

    query['pickupLocation.latitude'] = { $gte: pickupLat - latDelta, $lte: pickupLat + latDelta };
    query['pickupLocation.longitude'] = { $gte: pickupLng - lngDelta, $lte: pickupLng + lngDelta };
  } else if (filters.pickupArea) {
    query['pickupLocation.address'] = { $regex: filters.pickupArea, $options: 'i' };
  }

  // Optional corridor matching: when the passenger's destination is also supplied,
  // only surface rides whose destination is roughly along the same corridor
  // (within a wider radius), instead of matching on pickup proximity alone.
  let destinationLat = null;
  let destinationLng = null;
  const destinationRadiusKm = radiusKm * 1.5;
  if (filters.destinationLat && filters.destinationLng) {
    destinationLat = Number(filters.destinationLat);
    destinationLng = Number(filters.destinationLng);
    const latDelta = destinationRadiusKm / 111;
    const lngDelta = destinationRadiusKm / (111 * Math.cos(destinationLat * (Math.PI / 180)));

    query['destinationLocation.latitude'] = { $gte: destinationLat - latDelta, $lte: destinationLat + latDelta };
    query['destinationLocation.longitude'] = { $gte: destinationLng - lngDelta, $lte: destinationLng + lngDelta };
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

  const rides = await Ride.find(query)
    .populate('driver', 'firstName lastName profileImage averageRating')
    .populate('driverVehicle')
    .sort({ journeyDate: 1, journeyTime: 1 });

  if (pickupLat === null) {
    return rides;
  }

  // Enforce the true circular radius (the bounding box above is only a coarse
  // pre-filter) and annotate + sort by actual distance from the requested pickup point.
  return rides
    .map((ride) => ride.toObject())
    .map((ride) => ({
      ...ride,
      distanceKm: Math.round(
        haversineKm(pickupLat, pickupLng, ride.pickupLocation.latitude, ride.pickupLocation.longitude) * 10
      ) / 10,
    }))
    .filter((ride) => ride.distanceKm <= radiusKm)
    .filter((ride) => {
      if (destinationLat === null) return true;
      const destDistance = haversineKm(
        destinationLat, destinationLng,
        ride.destinationLocation.latitude, ride.destinationLocation.longitude
      );
      return destDistance <= destinationRadiusKm;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
};

export const getRidesByDriver = async (driverId) => {
  return await Ride.find({ driver: driverId })
    .populate('driverVehicle')
    .sort({ createdAt: -1 });
};

export const updateRideStatus = async (id, driverId, status) => {
  const ride = await Ride.findOne({ _id: id, driver: driverId });
  if (!ride) throw new ApiError(404, 'Ride not found or unauthorized');
  const allowed = ['ACTIVE', 'FULL', 'FROZEN', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED'];
  if (!allowed.includes(status)) throw new ApiError(400, 'Invalid status');
  if (ride.rideStatus !== status && !ALLOWED_TRANSITIONS[ride.rideStatus]?.includes(status)) {
    throw new ApiError(400, `Cannot move ride from ${ride.rideStatus} to ${status}`);
  }

  // Track driver cancellations
  if (status === 'CANCELLED' && ride.rideStatus !== 'CANCELLED') {
    const now = new Date();
    const [hours, minutes] = ride.journeyTime.split(':');
    const departureDate = new Date(ride.journeyDate);
    departureDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    
    const hoursUntilDeparture = (departureDate - now) / (1000 * 60 * 60);

    if (hoursUntilDeparture < 24 && hoursUntilDeparture >= 0) {
      const updateQuery = {};
      if (hoursUntilDeparture < 2) {
        updateQuery.$inc = { cancellations2h: 1 };
      } else if (hoursUntilDeparture < 6) {
        updateQuery.$inc = { cancellations6h: 1 };
      } else {
        updateQuery.$inc = { cancellations24h: 1 };
      }
      await User.findByIdAndUpdate(driverId, updateQuery);
    }
  }

  const previousStatus = ride.rideStatus;

  // Compute fuel-type-aware eco-credits/emissions on completion, before saving
  // the new status, so the ride document is written once with everything set.
  if (status === 'COMPLETED' && previousStatus !== 'COMPLETED') {
    const confirmedBookings = await Booking.find({ ride: ride._id, bookingStatus: 'confirmed' });
    const vehicle = await Vehicle.findById(ride.driverVehicle).select('vehicleType');
    const fuelType = vehicle?.vehicleType || 'petrol';
    const distanceKm = ride.routeDistance || 0;

    if (distanceKm > 0 && confirmedBookings.length > 0) {
      const totalSeats = (ride.availableSeats || 0) + (ride.bookedSeats || 0);
      const occupancyRatio = totalSeats > 0 ? (ride.bookedSeats || 0) / totalSeats : 0;

      ride.driverCreditsEarned = DRIVER_BASE_CREDITS + occupancyRatio * distanceKm * DRIVER_FUEL_CREDITS[fuelType];
      const emissionPerCar = distanceKm * EMISSION_FACTORS_KG_PER_KM[fuelType];
      ride.totalEmissionSavedKg = emissionPerCar * confirmedBookings.length;

      const passengerCreditsEarned = distanceKm * PASSENGER_CREDITS_PER_KM;
      const emissionSavedPerPassenger = ride.totalEmissionSavedKg / confirmedBookings.length;

      await Booking.updateMany(
        { _id: { $in: confirmedBookings.map((b) => b._id) } },
        { $set: { creditsEarned: passengerCreditsEarned, emissionSavedKg: emissionSavedPerPassenger } }
      );
    } else {
      ride.driverCreditsEarned = DRIVER_BASE_CREDITS;
    }
  }

  ride.rideStatus = status;
  await ride.save();

  // Notify every passenger with a live booking on this ride when the driver
  // cancels or completes it, so they're not left waiting on a dead ride.
  if ((status === 'CANCELLED' || status === 'COMPLETED') && previousStatus !== status) {
    const affectedBookings = await Booking.find({
      ride: ride._id,
      bookingStatus: { $in: ['pending', 'confirmed', 'waitlisted'] },
    }).select('passenger');

    const message = status === 'CANCELLED'
      ? 'The Rider has cancelled this ride.'
      : 'This ride has been marked as completed.';

    affectedBookings.forEach((booking) => {
      emitToUser(booking.passenger.toString(), 'ride:status', {
        rideId: ride._id,
        status,
        message,
      }).catch((err) => console.warn('[RIDE] notify passenger error:', err.message));
    });
  }

  return ride;
};
