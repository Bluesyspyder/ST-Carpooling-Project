// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as locationService from '@/modules/locations/location.service';

export const GET = apiHandler(async (req, { params, user }) => {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams.entries());
  if (!query.lat || !query.lng) throw new ApiError(400, 'Missing lat/lng parameters');
  const result = await locationService.reverseGeocode(Number(query.lat), Number(query.lng));
  return NextResponse.json({ status: 'success', data: result }, { status: 200 });
}, {});

