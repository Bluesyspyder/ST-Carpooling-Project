import express from 'express';
import * as rideController from './ride.controller.js';
import { createRideSchema, searchRidesSchema } from './ride.validation.js';
import validate from '../../shared/middleware/validate.middleware.js';
import { protect } from '../auth/auth.middleware.js';

const router = express.Router();

// Search and detail routes are open to read
router.get('/', validate(searchRidesSchema), rideController.searchRides);
router.get('/:id', rideController.getRideDetails);

// Creation routes require JWT Authentication
router.post('/', protect, validate(createRideSchema), rideController.createRide);

export default router;
