// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as bookingService from '@/modules/bookings/booking.service';
import Ride from '@/modules/rides/ride.model';
import { emitToUser } from '@/socket/socketHandler';

export const PATCH = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = rawBody;
  const { status } = body;
  const booking = await bookingService.updateBookingStatus(params!.id, user._id.toString(), status);
  if (booking.passenger) { const passengerId = booking.passenger._id?.toString() || booking.passenger.toString(); const event = status === 'confirmed' ? 'booking:accepted' : 'booking:rejected'; emitToUser(passengerId, event, { bookingId: booking._id, rideId: booking.ride, status, message: status === 'confirmed' ? '🎉 Your booking has been accepted by the Rider!' : 'Your booking request was declined.' }); }
  return NextResponse.json({ status: 'success', data: { booking } }, { status: 200 });
}, { protect: true });

