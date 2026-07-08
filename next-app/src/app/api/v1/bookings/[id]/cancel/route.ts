// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as bookingService from '@/modules/bookings/booking.service';
import Ride from '@/modules/rides/ride.model';
import { emitToUser } from '@/socket/socketHandler';

export const POST = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = rawBody;
  const result = await bookingService.cancelBooking(params!.id, user.id);
  const { booking } = result;
  const ride = await Ride.findById(booking.ride).select('driver source destination').lean();
  if (ride?.driver) { emitToUser(ride.driver.toString(), 'booking:cancelled', { bookingId: booking._id, rideId: booking.ride, route: `${ride.source} → ${ride.destination}`, message: 'A Co-Rider cancelled their booking.' }); }
  return NextResponse.json({ status: 'success', data: { booking } }, { status: 200 });
}, { protect: true, rateLimit: { name: 'bookings-cancel', limit: 20, windowSeconds: 60 } });

