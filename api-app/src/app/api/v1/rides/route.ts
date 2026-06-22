// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as rideService from '@/modules/rides/ride.service';
import { searchRidesSchema, createRideSchema } from '@/modules/rides/ride.validation';

export const GET = apiHandler(async (req, { params, user }) => {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const queryParams = validate(searchRidesSchema, { query }).query;
  const { journeyDate, pickupArea, driverName, seats } = queryParams;
  const rides = await rideService.getRides({ journeyDate, pickupArea, driverName, seats });
  return NextResponse.json({ status: 'success', results: rides.length, data: { rides } }, { status: 200 });
}, {});

export const POST = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = validate(createRideSchema, { body: rawBody }).body;
  const ride = await rideService.createRide({ ...body, driver: user.id });
  return NextResponse.json({ status: 'success', data: { ride } }, { status: 201 });
}, { protect: true });

