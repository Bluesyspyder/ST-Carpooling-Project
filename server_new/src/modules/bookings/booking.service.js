import Booking from './booking.model.js';
import Ride from '../rides/ride.model.js';
import ApiError from '../../shared/utils/api-error.js';
import { recordLocationUsage } from '../users/user.service.js';

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
      `${fieldName} must be confirmed on the map before booking. Click "Confirm Location" on the pin.`
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
 * Register a new booking.
 * pickupLocation must be coordinate-verified before booking can be created.
 */
export const createBooking = async (bookingData) => {
  const ride = await Ride.findById(bookingData.ride);
  if (!ride) throw new ApiError(404, 'Ride not found');
  if (ride.driver.toString() === bookingData.passenger.toString()) {
    throw new ApiError(400, 'You cannot book your own ride');
  }
  if (ride.status !== 'pending' && ride.status !== 'active') {
    throw new ApiError(400, 'This ride is not available for booking');
  }
  if (ride.availableSeats < bookingData.seatsBooked) {
    throw new ApiError(400, 'Insufficient seats available for this ride');
  }

  const pickup = buildVerifiedLocation(bookingData.pickupLocation, 'Pickup location');

  bookingData.bookingAmount  = ride.pricePerSeat * bookingData.seatsBooked;
  bookingData.bookingStatus  = 'confirmed';
  bookingData.pickupLocation = pickup;

  const booking = await Booking.create(bookingData);

  ride.availableSeats -= bookingData.seatsBooked;
  await ride.save();

  // Record usage (fire-and-forget)
  recordLocationUsage(bookingData.passenger, pickup)
    .catch((err) => console.warn('[BOOKING] recordLocationUsage error:', err.message));

  return booking;
};

export const getBookingsByUser = async (userId) => {
  return await Booking.find({ passenger: userId })
    .populate({
      path: 'ride',
      populate: [
        { path: 'driver',  select: 'firstName lastName profileImage' },
        { path: 'vehicle' },
      ],
    });
};

export const cancelBooking = async (id, userId) => {
  const booking = await Booking.findOne({ _id: id, passenger: userId });
  if (!booking) throw new ApiError(404, 'Booking not found or unauthorized');
  if (booking.bookingStatus === 'cancelled') throw new ApiError(400, 'Booking is already cancelled');

  booking.bookingStatus = 'cancelled';
  await booking.save();

  const ride = await Ride.findById(booking.ride);
  if (ride) {
    ride.availableSeats += booking.seatsBooked;
    await ride.save();
  }
  return booking;
};
