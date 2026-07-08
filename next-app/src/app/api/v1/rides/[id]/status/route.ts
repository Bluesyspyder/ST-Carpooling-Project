// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate } from '@/lib/api-wrapper';
import * as rideService from '@/modules/rides/ride.service';
import { updateRideStatusSchema } from '@/modules/rides/ride.validation';

export const PATCH = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const { status, pin, demoBypass, demoSecret } = validate(updateRideStatusSchema, { body: rawBody }).body;
  const ride = await rideService.updateRideStatus(params!.id, user.id, status, { pin, demoBypass, demoSecret });
  return NextResponse.json({ status: 'success', data: { ride } }, { status: 200 });
}, { protect: true, restrictTo: ['hybrid', 'admin'], rateLimit: { name: 'rides-status', limit: 30, windowSeconds: 60 } });
