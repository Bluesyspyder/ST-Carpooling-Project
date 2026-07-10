// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate } from '@/lib/api-wrapper';
import * as vehicleService from '@/modules/vehicles/vehicle.service';
import { updateVehicleSchema } from '@/modules/vehicles/vehicle.validation';

export const PATCH = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = validate(updateVehicleSchema, { body: rawBody }).body;
  const vehicle = await vehicleService.updateVehicle(params.vehicleId, user.id, body);
  return NextResponse.json({ status: 'success', data: { vehicle } }, { status: 200 });
}, { protect: true });

export const DELETE = apiHandler(async (req, { params, user }) => {
  await vehicleService.deleteVehicle(params.vehicleId, user.id);
  return NextResponse.json({ status: 'success', data: null }, { status: 200 });
}, { protect: true });
