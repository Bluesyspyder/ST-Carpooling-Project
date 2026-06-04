import * as vehicleService from './vehicle.service.js';

/**
 * Create a new vehicle controller
 */
export const createVehicle = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.createVehicle({
      ...req.body,
      owner: req.user.id,
    });
    return res.status(201).json({
      status: 'success',
      data: { vehicle },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's vehicles controller
 */
export const getMyVehicles = async (req, res, next) => {
  try {
    const vehicles = await vehicleService.getVehiclesByOwner(req.user.id);
    return res.status(200).json({
      status: 'success',
      data: { vehicles },
    });
  } catch (error) {
    next(error);
  }
};
