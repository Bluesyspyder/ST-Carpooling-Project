import express from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/users/user.routes.js';
import vehicleRoutes from '../modules/vehicles/vehicle.routes.js';
import rideRoutes from '../modules/rides/ride.routes.js';
import bookingRoutes from '../modules/bookings/booking.routes.js';
import reviewRoutes from '../modules/reviews/review.routes.js';
import paymentRoutes from '../modules/payments/payment.routes.js';
import locationRoutes from '../modules/locations/location.routes.js';

const router = express.Router();

// Mount modules onto API sub-routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/rides', rideRoutes);
router.use('/bookings', bookingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/payments', paymentRoutes);
router.use('/locations', locationRoutes);

export default router;
