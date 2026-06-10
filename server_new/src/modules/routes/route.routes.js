import express from 'express';
import { calculateRouteHandler } from './route.controller.js';

const router = express.Router();

// Public: no authentication needed for route calculation
router.post('/calculate', calculateRouteHandler);

export default router;
