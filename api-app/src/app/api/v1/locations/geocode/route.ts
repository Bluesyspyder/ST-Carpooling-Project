// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as locationService from '@/modules/locations/location.service';

export const GET = apiHandler(async (req, { params, user }) => {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams.entries());
  if (!query.address) throw new ApiError(400, 'Missing address parameter');
  const result = await locationService.geocodeAddress(query.address as string);
  return NextResponse.json({ status: 'success', data: result }, { status: 200 });
}, {});

