import express from 'express';
import {
  getMapConfigHandler,
  getPincodeLocationHandler,
} from './location.controller.js';

const router = express.Router();

router.get('/map-config', getMapConfigHandler);
router.get('/pincode/:pincode', getPincodeLocationHandler);

export default router;
