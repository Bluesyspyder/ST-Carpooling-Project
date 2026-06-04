import * as rideService from './ride.service.js';

/**
 * Create a new ride offer controller
 */
export const createRide = async (req, res, next) => {
  try {
    const ride = await rideService.createRide({
      ...req.body,
      driver: req.user.id,
    });
    return res.status(201).json({
      status: 'success',
      data: { ride },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search rides matching criteria controller
 */
export const searchRides = async (req, res, next) => {
  try {
    const { source, destination, departureDate } = req.query;
    const rides = await rideService.queryRides({ source, destination, departureDate });
    return res.status(200).json({
      status: 'success',
      results: rides.length,
      data: { rides },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ride details by ID controller
 */
export const getRideDetails = async (req, res, next) => {
  try {
    const ride = await rideService.getRideById(req.params.id);
    return res.status(200).json({
      status: 'success',
      data: { ride },
    });
  } catch (error) {
    next(error);
  }
};
