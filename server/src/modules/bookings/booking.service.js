import Booking from './booking.model.js';
import Ride from '../rides/ride.model.js';
import ApiError from '../../shared/utils/api-error.js';
import { geocodeAddressWithFallback } from '../locations/geocoding.service.js';

/**
 * Register a new booking and deduct seats from the ride
 * @param {object} bookingData - Booking specifications
 * @returns {Promise<object>} Created booking document
 */
export const createBooking = async (bookingData) => {
  const ride = await Ride.findById(bookingData.ride);
  if (!ride) {
    throw new ApiError(404, 'Ride not found');
  }

  if (ride.driver.toString() === bookingData.passenger.toString()) {
    throw new ApiError(400, 'You cannot book your own ride');
  }

  if (ride.status !== 'pending' && ride.status !== 'active') {
    throw new ApiError(400, 'This ride is not available for booking');
  }

  if (ride.availableSeats < bookingData.seatsBooked) {
    throw new ApiError(400, 'Insufficient seats available for this ride');
  }

  // Resolve pickup location
  let pickup;
  if (
    bookingData.pickupLocation &&
    Number.isFinite(bookingData.pickupLocation.latitude) &&
    Number.isFinite(bookingData.pickupLocation.longitude) &&
    (bookingData.pickupLocation.confirmed || bookingData.pickupLocation.manual)
  ) {
    pickup = {
      address: bookingData.pickupLocation.address || bookingData.pickupAddress,
      latitude: bookingData.pickupLocation.latitude,
      longitude: bookingData.pickupLocation.longitude,
      geocodingFallbackLevel: bookingData.pickupLocation.geocodingFallbackLevel || 'User Confirmed',
      geocodingVerified: bookingData.pickupLocation.geocodingVerified !== undefined ? bookingData.pickupLocation.geocodingVerified : true,
    };
  } else {
    const geocoded = await geocodeAddressWithFallback(bookingData.pickupAddress);
    if (!geocoded) {
      const error = new ApiError(400, 'Geocoding failed for pickup address. Please select location manually.');
      error.code = 'GEOCODING_FAILED';
      error.data = { field: 'pickupAddress', address: bookingData.pickupAddress };
      throw error;
    }
    if (!geocoded.geocodingVerified && (!bookingData.pickupLocation || !bookingData.pickupLocation.confirmed)) {
      const error = new ApiError(400, 'Low confidence result for pickup address. Please confirm.');
      error.code = 'GEOCODING_LOW_CONFIDENCE';
      error.data = { field: 'pickupAddress', location: geocoded };
      throw error;
    }
    pickup = geocoded;
  }

  // Calculate pricing based on ride price
  bookingData.bookingAmount = ride.pricePerSeat * bookingData.seatsBooked;
  bookingData.bookingStatus = 'confirmed'; // Auto-confirm for boilerplate simplicity
  bookingData.pickupLocation = pickup;

  const booking = await Booking.create(bookingData);

  // Update ride available seats
  ride.availableSeats -= bookingData.seatsBooked;
  await ride.save();

  return booking;
};

/**
 * Find bookings registered by a user
 * @param {string} userId - User ID
 * @returns {Promise<array>} Array of populated bookings
 */
export const getBookingsByUser = async (userId) => {
  return await Booking.find({ passenger: userId })
    .populate({
      path: 'ride',
      populate: [
        { path: 'driver', select: 'firstName lastName profileImage' },
        { path: 'vehicle' }
      ]
    });
};

/**
 * Cancel a booking and refund seats to the ride
 * @param {string} id - Booking ID
 * @param {string} userId - Requesting user ID
 * @returns {Promise<object>} Cancelled booking document
 */
export const cancelBooking = async (id, userId) => {
  const booking = await Booking.findOne({ _id: id, passenger: userId });
  if (!booking) {
    throw new ApiError(404, 'Booking not found or unauthorized');
  }

  if (booking.bookingStatus === 'cancelled') {
    throw new ApiError(400, 'Booking is already cancelled');
  }

  booking.bookingStatus = 'cancelled';
  await booking.save();

  // Restore seats to the ride offer
  const ride = await Ride.findById(booking.ride);
  if (ride) {
    ride.availableSeats += booking.seatsBooked;
    await ride.save();
  }

  return booking;
};
