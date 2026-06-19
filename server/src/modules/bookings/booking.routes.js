import express from 'express';
import * as bookingController from './booking.controller.js';
import { createBookingSchema } from './booking.validation.js';
import validate from '../../shared/middleware/validate.middleware.js';
import { protect } from '../auth/auth.middleware.js';

const router = express.Router();

// All booking interactions require token authentication
router.use(protect);

router.post('/', validate(createBookingSchema), bookingController.createBooking);
router.get('/', bookingController.getMyBookings); // Fallback
router.get('/my-bookings', bookingController.getMyBookings);
router.get('/my-rides', bookingController.getMyRidesBookings);
router.patch('/:id/status', bookingController.updateBookingStatus);
router.post('/:id/cancel', bookingController.cancelBooking);

export default router;
