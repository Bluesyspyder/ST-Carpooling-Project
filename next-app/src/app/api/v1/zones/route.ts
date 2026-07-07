// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, ApiError } from '@/lib/api-wrapper';
import Zone from '@/modules/zones/zone.model';

/**
 * GET /api/v1/zones
 * Public — list all active zones (used by the map layer to draw boundaries).
 */
export const GET = apiHandler(async () => {
  const zones = await Zone.find({ isActive: true }).select('-createdBy -__v').sort({ name: 1 });
  return NextResponse.json(
    { status: 'success', results: zones.length, data: { zones } },
    { status: 200 }
  );
}, { rateLimit: { name: 'zones-list', limit: 60, windowSeconds: 60 } });

/**
 * POST /api/v1/zones
 * Admin only — create a new geofence zone.
 *
 * Body:
 * {
 *   name: string,
 *   description?: string,
 *   polygon: {
 *     type: "Polygon",
 *     coordinates: [[[lng, lat], ...]]  // first === last to close ring
 *   },
 *   center?: { latitude: number, longitude: number }
 * }
 */
export const POST = apiHandler(async (req, { user }) => {
  const body = await parseBody(req);

  if (!body.name) throw new ApiError(400, 'Zone name is required.');
  if (!body.polygon?.coordinates) throw new ApiError(400, 'polygon.coordinates is required.');

  const zone = await Zone.create({
    name: body.name,
    description: body.description || '',
    polygon: {
      type: 'Polygon',
      coordinates: body.polygon.coordinates,
    },
    center: body.center || {},
    isActive: body.isActive !== false,
    createdBy: user.id,
  });

  return NextResponse.json({ status: 'success', data: { zone } }, { status: 201 });
}, { protect: true, restrictTo: ['admin'] });
