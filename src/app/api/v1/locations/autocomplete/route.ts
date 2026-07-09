// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as locationService from '@/modules/locations/location.service';

export const GET = apiHandler(async (req, { params, user }) => {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams.entries());
  if (!query.q) throw new ApiError(400, 'Missing search query (q)');
  const results = await locationService.autocompleteAddress(query.q as string);
  return NextResponse.json({ status: 'success', data: results }, { status: 200 });
}, { rateLimit: { name: 'locations-autocomplete', limit: 30, windowSeconds: 60 } });

