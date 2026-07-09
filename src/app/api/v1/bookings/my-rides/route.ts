// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as bookingService from '@/modules/bookings/booking.service';
import Ride from '@/modules/rides/ride.model';
import { emitToUser } from '@/socket/socketHandler';

export const GET = apiHandler(async (req, { params, user }) => {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = Number(url.searchParams.get('limit')) || 10;
  const result = await bookingService.getMyRidesBookingsPaginated(user.id, page, limit);
  return NextResponse.json({ status: 'success', data: result }, { status: 200 });
}, { protect: true });

