// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody } from '@/lib/api-wrapper';
import { calculateRoute } from '@/modules/routes/route.service';

export const POST = apiHandler(async (req) => {
  const body = await parseBody(req);
  
  if (!body.origin || !body.destination) {
    return NextResponse.json({ status: 'error', message: 'origin and destination are required' }, { status: 400 });
  }
  
  const result = await calculateRoute({ origin: body.origin, destination: body.destination });
  
  return NextResponse.json({ status: 'success', data: result }, { status: 200 });
}, { protect: false });
