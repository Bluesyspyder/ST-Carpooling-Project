import * as bookingService from './booking.service.js';
import Ride from '../rides/ride.model.js';
import { emitToUser } from '../../socket/socketHandler.js';

/**
 * Request a new ride booking controller.
 * Emits 'booking:new' to the driver on creation.
 */
export const createBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.createBooking({
      ...req.body,
      passenger: req.user.id,
    });

    // Notify the driver that they have a new booking request
    const ride = await Ride.findById(booking.ride).select('driver source destination').lean();
    if (ride?.driver) {
      emitToUser(ride.driver.toString(), 'booking:new', {
        bookingId: booking._id,
        rideId: booking.ride,
        route: `${ride.source} → ${ride.destination}`,
        passengerName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
        seatsBooked: booking.seatsBooked,
        message: 'You have a new booking request!',
      });
    }

    return res.status(201).json({
      status: 'success',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's passenger bookings controller (paginated)
 */
export const getMyBookings = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await bookingService.getMyBookingsPaginated(req.user.id, page, limit);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get driver's incoming ride bookings controller (paginated)
 */
export const getMyRidesBookings = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await bookingService.getMyRidesBookingsPaginated(req.user.id, page, limit);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update active booking status (confirm/reject) controller.
 * Emits 'booking:accepted' or 'booking:rejected' to the passenger.
 */
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const booking = await bookingService.updateBookingStatus(req.params.id, req.user.id, status);

    // Notify the passenger about the decision
    if (booking.passenger) {
      const passengerId = booking.passenger._id?.toString() || booking.passenger.toString();
      const event = status === 'confirmed' ? 'booking:accepted' : 'booking:rejected';
      emitToUser(passengerId, event, {
        bookingId: booking._id,
        rideId: booking.ride,
        status,
        message: status === 'confirmed'
          ? '🎉 Your booking has been accepted by the Rider!'
          : 'Your booking request was declined.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an active booking controller.
 * Emits 'booking:cancelled' to the driver.
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const result = await bookingService.cancelBooking(req.params.id, req.user.id);
    const { booking } = result;

    // Notify the driver that a passenger cancelled
    const ride = await Ride.findById(booking.ride).select('driver source destination').lean();
    if (ride?.driver) {
      emitToUser(ride.driver.toString(), 'booking:cancelled', {
        bookingId: booking._id,
        rideId: booking.ride,
        route: `${ride.source} → ${ride.destination}`,
        message: 'A Co-Rider cancelled their booking.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};
