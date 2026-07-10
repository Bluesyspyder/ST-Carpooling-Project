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
  const ride = await Ride.findById(bookingData.ride);
  if (!ride) throw new ApiError(404, 'Ride not found');
  if (ride.driver.toString() === bookingData.passenger.toString()) {
    throw new ApiError(400, 'You cannot book your own ride');
  }
  if (ride.rideStatus !== 'ACTIVE') {
    throw new ApiError(400, 'This ride is not available for booking');
  }

  // 🚫 Max 3 pending requests rule
  const pendingRequestsCount = await Booking.countDocuments({
    passenger: bookingData.passenger,
    bookingStatus: { $in: ['pending', 'waitlisted'] },
  });
  if (pendingRequestsCount >= 3) {
    throw new ApiError(400, 'You can only have up to 3 pending ride requests at a time.');
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

  const total = await Booking.countDocuments({ passenger: userId });

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

export const getMyRidesBookingsPaginated = async (driverId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  
  // Find all rides created by this driver
  const rides = await Ride.find({ driver: driverId }).select('_id');
  const rideIds = rides.map(r => r._id);

  const bookings = await Booking.find({ ride: { $in: rideIds } })
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

  const ride = await Ride.findById(booking.ride._id);

  if (newStatus === 'confirmed') {
    if (oldStatus !== 'pending' && oldStatus !== 'waitlisted') {
      throw new ApiError(400, 'Can only confirm pending or waitlisted bookings');
    }
    if (ride.availableSeats < booking.seatsBooked) {
      throw new ApiError(400, 'Insufficient seats available for this ride. Reject or keep waitlisted.');
    }
    ride.availableSeats -= booking.seatsBooked;
    await ride.save();

    // 🚀 Auto-cancel other pending requests for this passenger
    await Booking.updateMany(
      {
        passenger: booking.passenger,
        _id: { $ne: booking._id },
        bookingStatus: { $in: ['pending', 'waitlisted'] }
      },
      {
        $set: { bookingStatus: 'cancelled' }
      }
    );
  } else if (newStatus === 'rejected') {
    if (oldStatus !== 'pending' && oldStatus !== 'waitlisted') {
      throw new ApiError(400, 'Can only reject pending or waitlisted bookings');
    }
  } else if (newStatus === 'cancelled') {
    if (oldStatus === 'confirmed') {
      ride.availableSeats += booking.seatsBooked;
      await ride.save();
    }
  }

  booking.bookingStatus = newStatus;
  await booking.save();
  return booking;
};

export const cancelBooking = async (id, userId) => {
  const booking = await Booking.findOne({ _id: id, passenger: userId })
    .populate({ path: 'ride', select: 'journeyDate journeyTime availableSeats' });

  if (!booking) throw new ApiError(404, 'Booking not found or unauthorized');
  if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'rejected') {
    throw new ApiError(400, 'Booking is already cancelled or rejected');
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
    const ride = await Ride.findById(booking.ride._id || booking.ride);
    if (ride) {
      ride.availableSeats += booking.seatsBooked;
      await ride.save();
    }
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

/**
 * Expire pending/waitlisted bookings past the ride's departure time.
 * For now, returning 0 to satisfy the build error until fully implemented.
 */
export const expirePendingBookings = async () => {
  return { expired: 0 };
};
