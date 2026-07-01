// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as vehicleService from '@/modules/vehicles/vehicle.service';

export const POST = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = rawBody;
  if (!body.vehicleImage) throw new ApiError(400, 'No image base64 provided');
  const vehicle = await vehicleService.updateVehicle(params!.vehicleId, user.id, { vehicleImage: body.vehicleImage });
  return NextResponse.json({ status: 'success', message: 'Vehicle image uploaded successfully', data: { vehicle } }, { status: 200 });
}, { protect: true });

