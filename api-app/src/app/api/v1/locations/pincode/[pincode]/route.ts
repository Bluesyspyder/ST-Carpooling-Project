// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as locationService from '@/modules/locations/location.service';

export const GET = apiHandler(async (req, { params, user }) => {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const location = await locationService.findPincodeLocation(params!.pincode);
  if (!location) throw new ApiError(404, 'Pincode not found');
  return NextResponse.json({ status: 'success', data: location }, { status: 200 });
}, {});

