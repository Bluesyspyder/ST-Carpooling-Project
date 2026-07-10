// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as vehicleService from '@/modules/vehicles/vehicle.service';
import { createVehicleSchema } from '@/modules/vehicles/vehicle.validation';

export const POST = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = validate(createVehicleSchema, { body: rawBody }).body;
  const result = await vehicleService.createVehicle(user.id, body);
  return NextResponse.json({ status: 'success', data: result }, { status: 201 });
}, { protect: true });

export const GET = apiHandler(async (req, { params, user }) => {
  const vehicles = await vehicleService.getVehiclesByOwner(user.id);
  return NextResponse.json({ status: 'success', data: { vehicles } }, { status: 200 });
}, { protect: true });

