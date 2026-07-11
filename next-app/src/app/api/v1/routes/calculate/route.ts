// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody } from '@/lib/api-wrapper';
import { calculateRoute, calculateMultiPointRoute } from '@/modules/routes/route.service';

export const POST = apiHandler(async (req) => {
  const body = await parseBody(req);
  
  if (body.waypoints && Array.isArray(body.waypoints) && body.waypoints.length >= 2) {
    const result = await calculateMultiPointRoute(body.waypoints);
    return NextResponse.json({ status: 'success', data: result }, { status: 200 });
  }
  
  if (!body.origin || !body.destination) {
    return NextResponse.json({ status: 'error', message: 'origin and destination are required' }, { status: 400 });
  }
  
  const result = await calculateRoute({ origin: body.origin, destination: body.destination });
  
  return NextResponse.json({ status: 'success', data: result }, { status: 200 });
}, { protect: false });
