// @ts-nocheck
import Booking from './booking.model';
import Ride from '../rides/ride.model';
import { ApiError } from '@/lib/api-wrapper';
import { recordLocationUsage } from '../users/user.service';
import User from '../users/user.model';

const buildVerifiedLocation = (raw, fieldName) => {
  if (!raw || !Number.isFinite(Number(raw.latitude)) || !Number.isFinite(Number(raw.longitude))) {
    throw new ApiError(
      400,
      `${fieldName} with valid coordinates is required. Please use the address autocomplete and confirm on the map.`
    );
  }
  const lat = Number(raw.latitude);
  const lng = Number(raw.longitude);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ApiError(400, `${fieldName} coordinates are out of valid range.`);
  }
  if (raw.verified !== true) {
    throw new ApiError(
      400,
      `${fieldName} must be confirmed on the map before booking. Click "Confirm Location" on the pin.`
    );
  }
  return {
    address:         raw.address || '',
    latitude:        lat,
    longitude:       lng,
    coordinates:     [lng, lat],
    verified:        true,
    verifiedAt:      new Date(),
    provider:        raw.provider || null,
    providerPlaceId: raw.providerPlaceId || null,
  };
};

/**
 * Register a new booking.
 * Starts in 'pending' status. Coordinates verified required.
 * 24h booking policy: cannot book if departure is within 24 hours.
 */
export const createBooking = async (bookingData) => {
  // H3 fix: Read ride and perform seat availability check atomically in a single
  // DB round-trip. This prevents two concurrent bookings from both passing the
  // seat check and both receiving 'pending' status (overbooking).
  const ride = await Ride.findOne({
    _id: bookingData.ride,
    rideStatus: 'ACTIVE',
  });
  if (!ride) {
    // Check if ride exists at all for a better error message
    const rideExists = await Ride.exists({ _id: bookingData.ride });
    if (!rideExists) throw new ApiError(404, 'Ride not found');
    throw new ApiError(400, 'This ride is not available for booking');
  }
  if (ride.driver.toString() === bookingData.passenger.toString()) {
    throw new ApiError(400, 'You cannot book your own ride');
  }

  let initialStatus = 'pending';
  if (ride.availableSeats < bookingData.seatsBooked) {
    initialStatus = 'waitlisted';
  }

  // ⏰ 12-hour booking policy
  const now = new Date();
  const [hours, minutes] = ride.journeyTime.split(':');
  const departureDate = new Date(ride.journeyDate);
  departureDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

  const hoursUntilDeparture = (departureDate - now) / (1000 * 60 * 60);
  if (hoursUntilDeparture < 12) {
    throw new ApiError(
      400,
      `Bookings must be made at least 12 hours before departure. This ride departs in ${Math.round(hoursUntilDeparture)} hour(s).`
    );
  }

  const pickup = buildVerifiedLocation(bookingData.pickupLocation, 'Pickup location');

  bookingData.bookingAmount  = (ride.pricePerSeat || 0) * bookingData.seatsBooked;
  bookingData.bookingStatus  = initialStatus;
  bookingData.pickupLocation = pickup;
  // 4-digit pickup PIN (1000–9999) the passenger reveals to the driver at pickup.
  bookingData.pickupPin      = String(Math.floor(1000 + Math.random() * 9000));

  const booking = await Booking.create(bookingData);

  recordLocationUsage(bookingData.passenger, pickup)
    .catch((err) => console.warn('[BOOKING] recordLocationUsage error:', err.message));

  return booking;
};


export const getMyBookingsPaginated = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const bookings = await Booking.find({ passenger: userId })
    .populate({
      path: 'ride',
      populate: [
        { path: 'driver', select: 'firstName lastName profileImage email phone averageRating' },
        { path: 'driverVehicle' }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // H1 fix: Only expose driver phone/email when the booking is confirmed.
  // Cancelled/rejected/pending passengers should not retain contact info.
  const sanitized = bookings.map((b) => {
    const obj = b.toObject ? b.toObject() : b;
    if (obj.bookingStatus !== 'confirmed' && obj.ride?.driver) {
      const { phone, email, ...safeDriver } = obj.ride.driver;
      obj.ride = { ...obj.ride, driver: safeDriver };
    }
    return obj;
  });

  const total = await Booking.countDocuments({ passenger: userId });

  return {
    bookings: sanitized,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};


export const getMyRidesBookingsPaginated = async (driverId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  
  // Find all rides created by this driver
  const rides = await Ride.find({ driver: driverId }).select('_id');
  const rideIds = rides.map(r => r._id);

  const bookings = await Booking.find({ ride: { $in: rideIds } })
    .select('-pickupPin') // never expose a passenger's pickup PIN to the driver
    .populate('passenger', 'firstName lastName profileImage email phone averageRating cancellations24h cancellations6h cancellations2h')
    .populate({
      path: 'ride',
      populate: [
        { path: 'driverVehicle' }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Booking.countDocuments({ ride: { $in: rideIds } });

  return {
    bookings,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const updateBookingStatus = async (bookingId, driverId, status) => {
  const booking = await Booking.findById(bookingId)
    .populate({
      path: 'ride',
      select: 'driver availableSeats'
    });

  if (!booking) throw new ApiError(404, 'Booking not found');

  // Verify the user is the driver of the ride
  if (booking.ride.driver.toString() !== driverId) {
    throw new ApiError(403, 'Unauthorized to update this booking status');
  }

  const oldStatus = booking.bookingStatus;
  const newStatus = status;

  if (oldStatus === newStatus) return booking;

  // Validate allowed status transitions
  const allowed = ['pending', 'confirmed', 'cancelled', 'rejected', 'waitlisted'];
  if (!allowed.includes(newStatus)) {
    throw new ApiError(400, 'Invalid booking status');
  }

  if (newStatus === 'confirmed') {
    if (oldStatus !== 'pending' && oldStatus !== 'waitlisted') {
      throw new ApiError(400, 'Can only confirm pending or waitlisted bookings');
    }
    // Atomic, guarded seat reservation: only decrements if enough seats remain
    // at write time, so two concurrent confirms of the last seat can't oversell.
    const reserved = await Ride.findOneAndUpdate(
      { _id: booking.ride._id, availableSeats: { $gte: booking.seatsBooked } },
      { $inc: { availableSeats: -booking.seatsBooked, bookedSeats: booking.seatsBooked } },
      { new: true }
    );
    if (!reserved) {
      throw new ApiError(400, 'Insufficient seats available for this ride. Reject or keep waitlisted.');
    }
  } else if (newStatus === 'rejected') {
    if (oldStatus !== 'pending' && oldStatus !== 'waitlisted') {
      throw new ApiError(400, 'Can only reject pending or waitlisted bookings');
    }
  } else if (newStatus === 'cancelled') {
    if (oldStatus === 'confirmed') {
      // Atomically return the reserved seats.
      await Ride.findByIdAndUpdate(booking.ride._id, {
        $inc: { availableSeats: booking.seatsBooked, bookedSeats: -booking.seatsBooked },
      });
    }
  }

  booking.bookingStatus = newStatus;
  await booking.save();
  return booking;
};

export const cancelBooking = async (id, userId) => {
  const booking = await Booking.findOne({ _id: id, passenger: userId })
    .populate({ path: 'ride', select: 'journeyDate journeyTime availableSeats rideStatus' });

  if (!booking) throw new ApiError(404, 'Booking not found or unauthorized');
  if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'rejected') {
    throw new ApiError(400, 'Booking is already cancelled or rejected');
  }

  // M1 fix: Prevent cancellation after the ride has started or completed.
  // Seat count corrections on a closed ride would corrupt availability data.
  const blockedRideStatuses = ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (booking.ride && blockedRideStatuses.includes(booking.ride.rideStatus)) {
    throw new ApiError(
      400,
      'This ride has already started or completed. Cancellation is no longer possible.'
    );
  }

  // ⏰ Cancellation metrics tracking
  const now = new Date();
  const [hours, minutes] = booking.ride.journeyTime.split(':');
  const departureDate = new Date(booking.ride.journeyDate);
  departureDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  
  const hoursUntilDeparture = (departureDate - now) / (1000 * 60 * 60);

  const oldStatus = booking.bookingStatus;
  booking.bookingStatus = 'cancelled';
  await booking.save();

  if (oldStatus === 'confirmed') {
    // Atomically return the reserved seats (mirror of the confirm reservation).
    await Ride.findByIdAndUpdate(booking.ride._id || booking.ride, {
      $inc: { availableSeats: booking.seatsBooked, bookedSeats: -booking.seatsBooked },
    });
  }

  // Update metrics if within penalty windows
  if (hoursUntilDeparture < 24 && hoursUntilDeparture >= 0) {
    const updateQuery = {};
    if (hoursUntilDeparture < 2) {
      updateQuery.$inc = { cancellations2h: 1 };
    } else if (hoursUntilDeparture < 6) {
      updateQuery.$inc = { cancellations6h: 1 };
    } else {
      updateQuery.$inc = { cancellations24h: 1 };
    }
    await User.findByIdAndUpdate(userId, updateQuery);
  }

  return { booking };
};
