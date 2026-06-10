import {
  findPincodeLocation,
  getAddressRouteLocations,
  getMapConfig,
  autocompleteAddress,
  reverseGeocode,
} from './location.service.js';

export const getMapConfigHandler = (req, res, next) => {
  try {
    res.status(200).json({ status: 'success', data: getMapConfig() });
  } catch (error) { next(error); }
};

export const getPincodeLocationHandler = async (req, res, next) => {
  try {
    const location = await findPincodeLocation(req.params.pincode);
    res.status(200).json({ status: 'success', data: { location } });
  } catch (error) { next(error); }
};

export const getAddressRouteLocationsHandler = async (req, res, next) => {
  try {
    const routeLocations = await getAddressRouteLocations(req.body.homeAddress);
    res.status(200).json({ status: 'success', data: routeLocations });
  } catch (error) { next(error); }
};

export const autocompleteAddressHandler = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.status(200).json({ status: 'success', data: { suggestions: [] } });
    }
    const suggestions = await autocompleteAddress(query);
    res.status(200).json({ status: 'success', data: { suggestions } });
  } catch (error) { next(error); }
};

export const reverseGeocodeHandler = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const location = await reverseGeocode(lat, lng);
    res.status(200).json({ status: 'success', data: { location } });
  } catch (error) { next(error); }
};
