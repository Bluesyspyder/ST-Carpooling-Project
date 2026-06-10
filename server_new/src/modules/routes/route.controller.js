import { calculateRoute } from './route.service.js';
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
