import express from 'express';
import * as userController from './user.controller.js';
import { updateProfileSchema } from './user.validation.js';
import validate from '../../shared/middleware/validate.middleware.js';
import { protect } from '../auth/auth.middleware.js';

const router = express.Router();

// Apply auth protection middleware to all profile routes
router.use(protect);

router.get('/profile', userController.getProfile);
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);

export default router;
