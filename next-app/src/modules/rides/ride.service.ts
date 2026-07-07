// @ts-nocheck
import Ride from './ride.model';
import Vehicle from '../vehicles/vehicle.model';
import User from '../users/user.model';
import Booking from '../bookings/booking.model';
import Zone from '../zones/zone.model';
import { ApiError } from '@/lib/api-wrapper';
import { recordLocationUsage } from '../users/user.service';
import { emitToUser } from '@/socket/socketHandler';
import { calculateRoute } from '../routes/route.service';

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
 * Build a soft (unverified-ok) location for via-stops.
 */
const buildViaStopLocation = (raw, index) => {
  if (!raw || !Number.isFinite(Number(raw.latitude)) || !Number.isFinite(Number(raw.longitude))) {
    throw new ApiError(400, `Via-stop ${index + 1} must have valid coordinates.`);
  }
  return {
    address:         raw.address || '',
    latitude:        Number(raw.latitude),
    longitude:       Number(raw.longitude),
    verified:        raw.verified === true,
    verifiedAt:      raw.verified ? new Date() : null,
    provider:        raw.provider || null,
    providerPlaceId: raw.providerPlaceId || null,
  };
};

/**
 * Register a new ride offer.
 * pickupLocation and destinationLocation must both be coordinate-verified.
 * viaStops (up to 2) are optional — soft coordinates accepted.
 * isRecurring + weeklyDays enable automatic daily cloning by the CRON endpoint.
 */
export const createRide = async (rideData) => {
  const vehicle = await Vehicle.findOne({ _id: rideData.driverVehicle, owner: rideData.driver });
  if (!vehicle) throw new ApiError(403, 'You can only create rides with your own vehicle');
  if (rideData.availableSeats > vehicle.seatCount) {
    throw new ApiError(400, 'Available seats cannot exceed vehicle seat count');
  }

  const pickup = buildVerifiedLocation(rideData.pickupLocation, 'Pickup location');
  const destination = buildVerifiedLocation(rideData.destinationLocation, 'Destination location');

  // Validate and build via-stops (Feature 1)
  const viaStops = (rideData.viaStops || []).map((vs, i) => buildViaStopLocation(vs, i));

  // Compute route distance + duration (Feature 3: ETA).
  // Build ordered waypoints: pickup → via-stops → destination
  let routeDistance = null;
  let routeDuration = null;
  try {
    const allWaypoints = [
      { latitude: pickup.latitude, longitude: pickup.longitude },
      ...viaStops.map(vs => ({ latitude: vs.latitude, longitude: vs.longitude })),
      { latitude: destination.latitude, longitude: destination.longitude },
    ];

    // Use multipoint if there are via-stops, otherwise simple two-point route
    if (viaStops.length > 0) {
      const { calculateMultiPointRoute } = await import('../routes/route.service');
      const routeResult = await calculateMultiPointRoute(allWaypoints);
      routeDistance = routeResult.distanceKm;
      routeDuration = routeResult.durationMinutes;
    } else {
      const routeResult = await calculateRoute({
        origin: { latitude: pickup.latitude, longitude: pickup.longitude },
        destination: { latitude: destination.latitude, longitude: destination.longitude },
      });
      routeDistance = routeResult.distanceKm;
      routeDuration = routeResult.durationMinutes;
    }
  } catch (err) {
    console.warn('[RIDE] Route calculation failed, falling back to haversine:', err.message);
    routeDistance = haversineKm(pickup.latitude, pickup.longitude, destination.latitude, destination.longitude);
    routeDuration = (routeDistance / 40) * 60; // rough 40 km/h city estimate
  }

  // Validate recurring settings (Feature 2)
  if (rideData.isRecurring && (!rideData.weeklyDays || rideData.weeklyDays.length === 0)) {
    throw new ApiError(400, 'Recurring rides must have at least one weeklyDay selected.');
  }

  const finalRideData = {
    ...rideData,
    pickupLocation: pickup,
    destinationLocation: destination,
    viaStops,
    rideStatus: 'ACTIVE',
    routeDistance: rideData.routeDistance ?? routeDistance,
    routeDuration: rideData.routeDuration ?? routeDuration,
    isRecurring: rideData.isRecurring ?? false,
    weeklyDays: rideData.isRecurring ? (rideData.weeklyDays || []) : [],
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

  // ── Polygon-based geofence filter (Feature 5) ───────────────────────────────
  // If any active Zone polygons are configured in the DB, restrict pickup
  // locations to those inside at least one zone. This replaces the simple
  // radius check for installations that have defined precise campus boundaries.
  // Falls back silently to haversine-only when no zones exist.
  try {
    const activeZones = await Zone.find({ isActive: true }).select('polygon');
    if (activeZones.length > 0) {
      // Build a $geoWithin $geometry filter using the first zone's polygon.
      // For multi-zone support we use $or across all zone polygons.
      const zoneFilters = activeZones.map((z) => ({
        'pickupLocation.coordinates': {
          $geoWithin: { $geometry: z.polygon },
        },
      }));
      query.$or = query.$or ? [...query.$or, ...zoneFilters] : zoneFilters;
    }
  } catch (zoneErr) {
    // Non-fatal: zones table may not exist yet in fresh installations
    console.warn('[RIDE] Zone geofence query skipped:', zoneErr.message);
  }

  const rides = await Ride.find(query)
    .populate('driver', 'firstName lastName profileImage averageRating')
    .populate('driverVehicle')
    .sort({ journeyDate: 1, journeyTime: 1 });

  if (pickupLat === null) {
    return rides;
  }

  // Via-stop corridor matching (Feature 1)
  // If the passenger supplied a via-point, only keep rides that:
  //   a) pass through it (ride has a viaStop within viaRadiusKm), OR
  //   b) have a destination within viaRadiusKm (so the passenger can still be dropped near there)
  const viaLat = filters.viaLat ? Number(filters.viaLat) : null;
  const viaLng = filters.viaLng ? Number(filters.viaLng) : null;
  const viaRadiusKm = radiusKm * 1.2;

  // Enforce the true circular radius (the bounding box above is only a coarse
  // pre-filter) and annotate + sort by actual distance from the requested pickup point.
  return rides
    .map((ride) => ride.toObject())
    .map((ride) => ({
      ...ride,
      distanceKm: Math.round(
        haversineKm(pickupLat, pickupLng, ride.pickupLocation.latitude, ride.pickupLocation.longitude) * 10
      ) / 10,
      // Annotate ETA from stored routeDuration (Feature 3)
      etaMinutes: ride.routeDuration ? Math.round(ride.routeDuration) : null,
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
    .filter((ride) => {
      // Via-stop corridor filter (Feature 1)
      if (viaLat === null) return true;
      // Check each via-stop on the ride
      const passesThrough = (ride.viaStops || []).some(
        (vs) => haversineKm(viaLat, viaLng, vs.latitude, vs.longitude) <= viaRadiusKm
      );
      // Also accept if the ride's destination itself is near the requested via-point
      const destNearVia = haversineKm(
        viaLat, viaLng,
        ride.destinationLocation.latitude, ride.destinationLocation.longitude
      ) <= viaRadiusKm;
      return passesThrough || destNearVia;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
};

export const getRidesByDriver = async (driverId) => {
  return await Ride.find({ driver: driverId })
    .populate('driverVehicle')
    .sort({ createdAt: -1 });
};

export const updateRideStatus = async (id, driverId, status, options = {}) => {
  const ride = await Ride.findOne({ _id: id, driver: driverId });
  if (!ride) throw new ApiError(404, 'Ride not found or unauthorized');
  const allowed = ['ACTIVE', 'FULL', 'FROZEN', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED'];
  if (!allowed.includes(status)) throw new ApiError(400, 'Invalid status');
  if (ride.rideStatus !== status && !ALLOWED_TRANSITIONS[ride.rideStatus]?.includes(status)) {
    throw new ApiError(400, `Cannot move ride from ${ride.rideStatus} to ${status}`);
  }

  // ── PIN-gated pickup: starting the ride (FROZEN → IN_PROGRESS) requires the
  // driver to enter a confirmed passenger's 4-digit pickup PIN. The matched
  // passenger is marked picked-up. This proves the right passenger is in the car.
  if (status === 'IN_PROGRESS' && ride.rideStatus === 'FROZEN') {
    // Demo Mode bypass: skip PIN check when a valid server-side secret is supplied.
    // This allows investor demos to run without needing a real passenger device.
    const isDemoBypass =
      options.demoBypass === true &&
      !!process.env.DEMO_MODE_SECRET &&
      options.demoSecret === process.env.DEMO_MODE_SECRET;

    if (!isDemoBypass) {
      const pin = String(options.pin || '').trim();
      if (!/^\d{4}$/.test(pin)) {
        throw new ApiError(400, 'A 4-digit passenger pickup PIN is required to start the ride.');
      }
      const matchedBooking = await Booking.findOne({
        ride: ride._id,
        bookingStatus: 'confirmed',
        pickupPin: pin,
      });
      if (!matchedBooking) {
        throw new ApiError(400, 'Invalid pickup PIN. Ask the passenger to read the PIN from their booking.');
      }
      if (!matchedBooking.pickedUp) {
        matchedBooking.pickedUp = true;
        matchedBooking.pickedUpAt = new Date();
        await matchedBooking.save();
      }
    } else {
      console.log('[DEMO] PIN bypass accepted for ride:', ride._id);
    }
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

      // Persist onto real, spendable/leaderboard-ranked User balances (atomic $inc).
      await Promise.all([
        User.findByIdAndUpdate(ride.driver, {
          $inc: {
            greenCreditsBalance: ride.driverCreditsEarned,
            lifetimeGreenCredits: ride.driverCreditsEarned,
            lifetimeCo2SavedKg: ride.totalEmissionSavedKg,
          },
        }),
        ...confirmedBookings.map((b) =>
          User.findByIdAndUpdate(b.passenger, {
            $inc: {
              greenCreditsBalance: passengerCreditsEarned,
              lifetimeGreenCredits: passengerCreditsEarned,
              lifetimeCo2SavedKg: emissionSavedPerPassenger,
            },
          })
        ),
      ]).catch((err) => console.warn('[RIDE] user credit increment error:', err.message));
    } else {
      ride.driverCreditsEarned = DRIVER_BASE_CREDITS;
      await User.findByIdAndUpdate(ride.driver, {
        $inc: { greenCreditsBalance: DRIVER_BASE_CREDITS, lifetimeGreenCredits: DRIVER_BASE_CREDITS },
      }).catch((err) => console.warn('[RIDE] user credit increment error:', err.message));
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

// ── Recurring Rides CRON helper (Feature 2) ─────────────────────────────────────
/**
 * spawnRecurringRides
 * Called once daily (via the /api/v1/rides/recurring CRON endpoint).
 * For every recurring template ride whose weeklyDays includes today's day-of-week,
 * create a fresh ACTIVE child ride dated for today — unless one already exists.
 *
 * Returns a summary { checked, spawned, skipped }.
 */
export const spawnRecurringRides = async () => {
  const now = new Date();
  const todayDow = now.getDay(); // 0 = Sunday … 6 = Saturday

  // Compute today's date at midnight (start of day) for the journey date
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Find all active recurring templates that include today
  const templates = await Ride.find({
    isRecurring: true,
    weeklyDays: todayDow,
    recurringParentId: null, // only top-level templates, not spawned children
    rideStatus: { $in: ['ACTIVE', 'FULL'] }, // only live templates
  });

  let spawned = 0;
  let skipped = 0;

  for (const template of templates) {
    // Check if a child for today already exists
    const alreadyExists = await Ride.findOne({
      recurringParentId: template._id,
      journeyDate: { $gte: todayStart, $lt: todayEnd },
    });

    if (alreadyExists) {
      skipped++;
      continue;
    }

    // Build a child ride from the template, dated for today
    const childData = {
      driver: template.driver,
      driverVehicle: template.driverVehicle,
      journeyDate: new Date(todayStart),
      journeyTime: template.journeyTime,
      flexibilityMinutes: template.flexibilityMinutes,
      availableSeats: template.availableSeats,
      bookedSeats: 0,
      pickupLocation: template.pickupLocation,
      destinationLocation: template.destinationLocation,
      viaStops: template.viaStops || [],
      routeDistance: template.routeDistance,
      routeDuration: template.routeDuration,
      notes: template.notes,
      rideStatus: 'ACTIVE',
      isRecurring: false,     // child is a one-off instance
      weeklyDays: [],
      recurringParentId: template._id,
    };

    await Ride.create(childData);
    spawned++;
  }

  console.log(`[CRON] spawnRecurringRides: checked=${templates.length} spawned=${spawned} skipped=${skipped}`);
  return { checked: templates.length, spawned, skipped };
};
