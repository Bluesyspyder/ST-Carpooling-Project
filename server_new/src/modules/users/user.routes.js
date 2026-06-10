import express from 'express';
import * as userController from './user.controller.js';
import { updateProfileSchema, addSavedAddressSchema, updateSavedAddressSchema } from './user.validation.js';
import validate from '../../shared/middleware/validate.middleware.js';
import { protect } from '../auth/auth.middleware.js';
import { handleImageUpload } from '../../shared/middleware/upload.middleware.js';

const router = express.Router();

router.use(protect);

// Profile
router.get('/profile', userController.getProfile);
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);
router.post('/profile/upload-image', handleImageUpload('profileImage'), userController.uploadProfileImage);

// Saved Addresses
router.get('/saved-addresses', userController.getSavedAddresses);
router.post('/saved-addresses', validate(addSavedAddressSchema), userController.addSavedAddress);
router.put('/saved-addresses/:id', validate(updateSavedAddressSchema), userController.updateSavedAddress);
router.delete('/saved-addresses/:id', userController.deleteSavedAddress);
router.patch('/saved-addresses/:id/default', userController.setDefaultSavedAddress);

// Recent / Frequent
router.get('/recent-addresses', userController.getRecentAddresses);
router.get('/frequent-addresses', userController.getFrequentAddresses);

export default router;
