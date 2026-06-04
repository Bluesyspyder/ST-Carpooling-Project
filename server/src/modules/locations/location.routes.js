import express from 'express';
import {
  getAddressRouteLocationsHandler,
  getMapConfigHandler,
  getPincodeLocationHandler,
} from './location.controller.js';

const router = express.Router();

router.get('/map-config', getMapConfigHandler);
router.post('/address-route', getAddressRouteLocationsHandler);
router.get('/pincode/:pincode', getPincodeLocationHandler);

export default router;
