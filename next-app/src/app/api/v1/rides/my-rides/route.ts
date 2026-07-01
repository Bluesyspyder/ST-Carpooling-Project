// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as rideService from '@/modules/rides/ride.service';

export const GET = apiHandler(async (req, { params, user }) => {
  const rides = await rideService.getRidesByDriver(user.id);
  return NextResponse.json({ status: 'success', results: rides.length, data: { rides } }, { status: 200 });
}, { protect: true });

