import Booking from '../bookings/booking.model.js';
import User from '../users/user.model.js';
import ApiError from '../../shared/utils/api-error.js';

/**
 * Create or update a rating for a completed ride.
 * Only the passenger of a confirmed booking can rate the driver.
 *
 * @param {string} bookingId  - The completed booking ID
 * @param {string} raterId    - The user submitting the rating (must be the passenger)
 * @param {number} rating     - 1–5 integer
 * @param {string} [comment]  - Optional review text
 */
export const createRating = async (bookingId, raterId, rating, comment) => {
  const booking = await Booking.findById(bookingId)
    .populate({ path: 'ride', select: 'driver departureTime status' });

  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.passenger.toString() !== raterId) {
    throw new ApiError(403, 'You can only rate rides you were a passenger on');
  }
  if (booking.bookingStatus !== 'confirmed') {
    throw new ApiError(400, 'You can only rate confirmed bookings');
  }
  if (booking.rated) {
    throw new ApiError(400, 'You have already rated this ride');
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be an integer between 1 and 5');
  }

  const driverId = booking.ride?.driver;
  if (!driverId) throw new ApiError(400, 'Driver not found for this ride');

  // Mark booking as rated
  booking.rated = true;
  booking.rating = rating;
  booking.ratingComment = comment || '';
  await booking.save();

  // Recalculate driver's average rating from all rated bookings
  const allRatedBookings = await Booking.find({
    rated: true,
    ride: { $ne: null },
  }).populate({ path: 'ride', match: { driver: driverId }, select: 'driver' });

  const driverRatings = allRatedBookings.filter((b) => b.ride !== null);

  if (driverRatings.length > 0) {
    const avgRating = driverRatings.reduce((sum, b) => sum + b.rating, 0) / driverRatings.length;
    await User.findByIdAndUpdate(driverId, {
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings: driverRatings.length,
    });
  }

  return { bookingId, rating, comment, driverId };
};
