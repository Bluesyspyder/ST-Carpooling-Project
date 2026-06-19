import express from 'express';
import { calculateRouteHandler, calculateMultiPointRouteHandler } from './route.controller.js';

const router = express.Router();

// Public: no authentication needed for route calculation
router.post('/calculate', calculateRouteHandler);
router.post('/calculate-multipoint', calculateMultiPointRouteHandler);

export default router;

