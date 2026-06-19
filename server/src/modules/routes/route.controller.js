import { calculateRoute, calculateMultiPointRoute } from './route.service.js';
import ApiError from '../../shared/utils/api-error.js';

/**
 * POST /api/v1/routes/calculate
 * Body: { origin: { latitude, longitude }, destination: { latitude, longitude } }
 */
export const calculateRouteHandler = async (req, res, next) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      throw new ApiError(400, 'Both origin and destination are required.');
    }

    const result = await calculateRoute({ origin, destination });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/routes/calculate-multipoint
 * Body: { waypoints: [{ latitude, longitude }, ...] }
 */
export const calculateMultiPointRouteHandler = async (req, res, next) => {
  try {
    const { waypoints } = req.body;

    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      throw new ApiError(400, 'At least 2 waypoints are required.');
    }

    const result = await calculateMultiPointRoute(waypoints);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

