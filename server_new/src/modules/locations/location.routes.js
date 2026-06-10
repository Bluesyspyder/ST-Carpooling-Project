import express from 'express';
import {
  getAddressRouteLocationsHandler,
  getMapConfigHandler,
  getPincodeLocationHandler,
  autocompleteAddressHandler,
  reverseGeocodeHandler,
} from './location.controller.js';

const router = express.Router();

router.get('/map-config', getMapConfigHandler);
router.post('/address-route', getAddressRouteLocationsHandler);
router.get('/pincode/:pincode', getPincodeLocationHandler);
router.get('/autocomplete', autocompleteAddressHandler);
router.get('/reverse-geocode', reverseGeocodeHandler);

export default router;
