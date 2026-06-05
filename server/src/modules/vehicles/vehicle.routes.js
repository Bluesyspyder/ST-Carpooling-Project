import express from 'express';
import * as vehicleController from './vehicle.controller.js';
import { createVehicleSchema } from './vehicle.validation.js';
import validate from '../../shared/middleware/validate.middleware.js';
import { protect } from '../auth/auth.middleware.js';
import { handleImageUpload } from '../../shared/middleware/upload.middleware.js';

const router = express.Router();

// Protect all vehicle routes with JWT auth
router.use(protect);

router.post('/', validate(createVehicleSchema), vehicleController.createVehicle);
router.get('/', vehicleController.getMyVehicles);
router.post('/:vehicleId/upload-image', handleImageUpload('vehicleImage'), vehicleController.uploadVehicleImage);

export default router;
