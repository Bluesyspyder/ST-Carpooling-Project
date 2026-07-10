// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, ApiError } from '@/lib/api-wrapper';
import { lookupVehicleByPlate } from '@/modules/vehicles/vehicle-lookup.service';

export const GET = apiHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const plateNumber = searchParams.get('vehiclePlateNumber');
  if (!plateNumber) throw new ApiError(400, 'vehiclePlateNumber query parameter is required');

  const vehicle = await lookupVehicleByPlate(plateNumber);
  return NextResponse.json({ status: 'success', data: { vehicle } }, { status: 200 });
}, { rateLimit: { name: 'vehicles-lookup', limit: 15, windowSeconds: 60 } });
