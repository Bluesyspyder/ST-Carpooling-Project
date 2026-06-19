import * as rideService from './ride.service.js';
import Booking from '../bookings/booking.model.js';

/**
 * Create a new ride offer controller
 */
export const createRide = async (req, res, next) => {
  try {
    const ride = await rideService.createRide({
      ...req.body,
      driver: req.user.id,
    });
    return res.status(201).json({
      status: 'success',
      data: { ride },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search rides matching criteria controller
 */
export const searchRides = async (req, res, next) => {
  try {
    const { journeyDate, pickupArea, driverName, seats } = req.query;
    const rides = await rideService.getRides({
      journeyDate,
      pickupArea,
      driverName,
      seats,
    });
    return res.status(200).json({
      status: 'success',
      results: rides.length,
      data: { rides },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get rides created by the logged-in driver
 */
export const getMyRides = async (req, res, next) => {
  try {
    const rides = await rideService.getRidesByDriver(req.user.id);
    return res.status(200).json({
      status: 'success',
      results: rides.length,
      data: { rides },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ride details by ID controller.
 * Returns the ride + ALL associated bookings (all statuses).
 */
export const getRideDetails = async (req, res, next) => {
  try {
    const ride = await rideService.getRideById(req.params.id);

    const bookings = await Booking.find({ ride: ride._id })
      .populate('passenger', 'firstName lastName profileImage phone email')
      .sort({ bookingStatus: 1, createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      data: { ride, bookings: bookings || [] },
    });
  } catch (error) {
    next(error);
  }
};

// ── TSP Route Optimization ────────────────────────────────────────────────────

/** Haversine great-circle distance in km */
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Total route cost for a permutation of pickup indices */
const routeCost = (perm, points, origin, dest) => {
  let cost = haversineKm(origin.lat, origin.lng, points[perm[0]].lat, points[perm[0]].lng);
  for (let i = 0; i < perm.length - 1; i++) {
    cost += haversineKm(points[perm[i]].lat, points[perm[i]].lng, points[perm[i + 1]].lat, points[perm[i + 1]].lng);
  }
  cost += haversineKm(points[perm[perm.length - 1]].lat, points[perm[perm.length - 1]].lng, dest.lat, dest.lng);
  return cost;
};

/** All permutations of an array */
const permutations = (arr) => {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) result.push([arr[i], ...p]);
  }
  return result;
};

/** Nearest-neighbor greedy heuristic — fallback for >8 passengers */
const nearestNeighbor = (points, origin) => {
  const remaining = points.map((_, i) => i);
  const order = [];
  let current = origin;
  while (remaining.length > 0) {
    let best = null, bestDist = Infinity;
    for (const idx of remaining) {
      const d = haversineKm(current.lat, current.lng, points[idx].lat, points[idx].lng);
      if (d < bestDist) { bestDist = d; best = idx; }
    }
    order.push(best);
    current = points[best];
    remaining.splice(remaining.indexOf(best), 1);
  }
  return order;
};

/**
 * GET /api/rides/:id/optimized-route
 * Brute-force TSP for ≤8 confirmed passengers; nearest-neighbor heuristic beyond that.
 * Only the driver of the ride may call this endpoint.
 */
export const getOptimizedRoute = async (req, res, next) => {
  try {
    const ride = await rideService.getRideById(req.params.id);

    if (ride.driver._id.toString() !== req.user.id) {
      return res.status(403).json({ status: 'fail', message: 'Only the ride driver can access route optimization.' });
    }

    const bookings = await Booking.find({ ride: ride._id, bookingStatus: 'confirmed' })
      .populate('passenger', 'firstName lastName profileImage phone');

    if (bookings.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          orderedWaypoints: [],
          totalDistanceKm: 0,
          algorithm: 'none',
          message: 'No confirmed passengers yet.',
        },
      });
    }

    const pickupPoints = bookings.map((b, i) => ({
      idx: i,
      lat: b.pickupLocation.latitude,
      lng: b.pickupLocation.longitude,
      booking: b,
    }));

    const origin = { lat: ride.pickupLocation.latitude, lng: ride.pickupLocation.longitude };
    const dest = {
      lat: ride.destinationLocation?.latitude  ?? ride.pickupLocation.latitude,
      lng: ride.destinationLocation?.longitude ?? ride.pickupLocation.longitude,
    };

    let bestOrder, algorithm;

    if (pickupPoints.length <= 8) {
      algorithm = 'brute-force-tsp';
      const indices = pickupPoints.map((_, i) => i);
      let bestCost = Infinity;
      for (const perm of permutations(indices)) {
        const cost = routeCost(perm, pickupPoints, origin, dest);
        if (cost < bestCost) { bestCost = cost; bestOrder = perm; }
      }
    } else {
      algorithm = 'nearest-neighbor-heuristic';
      bestOrder = nearestNeighbor(pickupPoints, origin);
    }

    const orderedWaypoints = bestOrder.map((idx, position) => {
      const pt = pickupPoints[idx];
      return {
        position: position + 1,
        lat: pt.lat,
        lng: pt.lng,
        address: pt.booking.pickupLocation.address,
        passenger: {
          id: pt.booking.passenger._id,
          firstName: pt.booking.passenger.firstName,
          lastName: pt.booking.passenger.lastName,
          phone: pt.booking.passenger.phone,
          profileImage: pt.booking.passenger.profileImage,
        },
        bookingId: pt.booking._id,
        seatsBooked: pt.booking.seatsBooked,
      };
    });

    let totalDistanceKm = haversineKm(origin.lat, origin.lng, pickupPoints[bestOrder[0]].lat, pickupPoints[bestOrder[0]].lng);
    for (let i = 0; i < bestOrder.length - 1; i++) {
      totalDistanceKm += haversineKm(
        pickupPoints[bestOrder[i]].lat, pickupPoints[bestOrder[i]].lng,
        pickupPoints[bestOrder[i + 1]].lat, pickupPoints[bestOrder[i + 1]].lng
      );
    }
    totalDistanceKm += haversineKm(
      pickupPoints[bestOrder[bestOrder.length - 1]].lat,
      pickupPoints[bestOrder[bestOrder.length - 1]].lng,
      dest.lat, dest.lng
    );

    return res.status(200).json({
      status: 'success',
      data: {
        orderedWaypoints,
        totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
        passengerCount: pickupPoints.length,
        algorithm,
        origin: { lat: origin.lat, lng: origin.lng, address: ride.source },
        destination: { lat: dest.lat, lng: dest.lng, address: ride.destination },
      },
    });
  } catch (error) {
    next(error);
  }
};
