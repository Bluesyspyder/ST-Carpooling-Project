// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as rideService from '@/modules/rides/ride.service';
import Booking from '@/modules/bookings/booking.model';

export const GET = apiHandler(async (req, { params, user }) => {
  const ride = await rideService.getRideById(params!.id);
  const bookings = await Booking.find({ ride: ride._id }).populate('passenger', 'firstName lastName profileImage phone email').sort({ bookingStatus: 1, createdAt: -1 });
  return NextResponse.json({ status: 'success', data: { ride, bookings: bookings || [] } }, { status: 200 });
}, { rateLimit: { name: 'rides-get-one', limit: 60, windowSeconds: 60 } });

