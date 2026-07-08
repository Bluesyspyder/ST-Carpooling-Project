// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as bookingService from '@/modules/bookings/booking.service';
import Ride from '@/modules/rides/ride.model';
import { emitToUser } from '@/socket/socketHandler';
import { createBookingSchema } from '@/modules/bookings/booking.validation';

export const POST = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = validate(createBookingSchema, { body: rawBody }).body;
  const booking = await bookingService.createBooking({ ...body, passenger: user.id });
  const ride = await Ride.findById(booking.ride).select('driver source destination').lean();
  if (ride?.driver) { emitToUser(ride.driver.toString(), 'booking:new', { bookingId: booking._id, rideId: booking.ride, route: `${ride.source} → ${ride.destination}`, passengerName: `${user.firstName || ''} ${user.lastName || ''}`.trim(), seatsBooked: booking.seatsBooked, message: 'You have a new booking request!' }); }
  return NextResponse.json({ status: 'success', data: { booking } }, { status: 201 });
}, { protect: true, rateLimit: { name: 'bookings-create', limit: 15, windowSeconds: 60 } });

