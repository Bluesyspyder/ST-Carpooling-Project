// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody } from '@/lib/api-wrapper';
import { calculateMultiPointRoute } from '@/modules/routes/route.service';

export const POST = apiHandler(async (req) => {
  const body = await parseBody(req);
  
  if (!body.waypoints || !Array.isArray(body.waypoints)) {
    return NextResponse.json({ status: 'error', message: 'waypoints array is required' }, { status: 400 });
  }
  
  const result = await calculateMultiPointRoute(body.waypoints);
  
  return NextResponse.json({ status: 'success', data: result }, { status: 200 });
}, { protect: false, rateLimit: { name: 'routes-calculate-multipoint', limit: 20, windowSeconds: 60 } });
