// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as locationService from '@/modules/locations/location.service';

export const POST = apiHandler(async (req, { params, user }) => {
  const body = await parseBody(req);
  const locations = await locationService.getAddressRouteLocations(body.origin, body.destination);
  return NextResponse.json({ status: 'success', data: locations }, { status: 200 });
}, {});

