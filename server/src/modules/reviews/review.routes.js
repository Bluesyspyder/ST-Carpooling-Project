import express from 'express';
import * as reviewController from './review.controller.js';
import { protect } from '../auth/auth.middleware.js';

const router = express.Router();

router.use(protect);

// POST /api/reviews/bookings/:bookingId/rate
router.post('/bookings/:bookingId/rate', reviewController.rateBooking);

export default router;
