import * as vehicleService from './vehicle.service.js';
import ApiError from '../../shared/utils/api-error.js';

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

/**
 * Upload vehicle image controller
 */
export const uploadVehicleImage = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;

    if (!req.fileBase64) {
      throw new ApiError(400, 'No image file provided');
    }

    const vehicle = await vehicleService.updateVehicle(vehicleId, req.user.id, {
      vehicleImage: req.fileBase64,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Vehicle image uploaded successfully',
      data: { vehicle },
    });
  } catch (error) {
    next(error);
  }
};
