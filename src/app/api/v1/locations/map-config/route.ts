// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as locationService from '@/modules/locations/location.service';

export const GET = apiHandler(async (req, { params, user }) => {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const config = await locationService.getMapConfig();
  return NextResponse.json({ status: 'success', data: config }, { status: 200 });
}, { rateLimit: { name: 'locations-map-config', limit: 30, windowSeconds: 60 } });

