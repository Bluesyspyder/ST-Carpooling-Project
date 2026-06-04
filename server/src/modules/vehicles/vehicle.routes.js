import express from 'express';
import * as vehicleController from './vehicle.controller.js';
import { createVehicleSchema } from './vehicle.validation.js';
import validate from '../../shared/middleware/validate.middleware.js';
import { protect } from '../auth/auth.middleware.js';

const router = express.Router();

// Protect all vehicle routes with JWT auth
router.use(protect);

router.post('/', validate(createVehicleSchema), vehicleController.createVehicle);
router.get('/', vehicleController.getMyVehicles);

export default router;
