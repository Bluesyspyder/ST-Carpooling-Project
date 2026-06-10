import * as bookingService from './booking.service.js';

/**
 * Request a new ride booking controller
 */
export const createBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.createBooking({
      ...req.body,
      passenger: req.user.id,
    });
    return res.status(201).json({
      status: 'success',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's passenger bookings controller
 */
export const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await bookingService.getBookingsByUser(req.user.id);
    return res.status(200).json({
      status: 'success',
      data: { bookings },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an active booking controller
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.cancelBooking(req.params.id, req.user.id);
    return res.status(200).json({
      status: 'success',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};
