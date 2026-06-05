import {
  findPincodeLocation,
  getAddressRouteLocations,
  getMapConfig,
} from './location.service.js';

export const getMapConfigHandler = (req, res, next) => {
  try {
    res.status(200).json({
      status: 'success',
      data: getMapConfig(),
    });
  } catch (error) {
    next(error);
  }
};

export const getPincodeLocationHandler = async (req, res, next) => {
  try {
    const location = await findPincodeLocation(req.params.pincode);
    
    res.status(200).json({
      status: 'success',
      data: { location },
    });
  } catch (error) {
    next(error);
  }
};

export const getAddressRouteLocationsHandler = async (req, res, next) => {
  try {
    const routeLocations = await getAddressRouteLocations(req.body.homeAddress);

    res.status(200).json({
      status: 'success',
      data: routeLocations,
    });
  } catch (error) {
    next(error);
  }
};
