// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as rideService from '@/modules/rides/ride.service';
import Booking from '@/modules/bookings/booking.model';

export const GET = apiHandler(async (req, { params, user }) => {
  const ride = await rideService.getRideById(params!.id);

  // Determine if the requesting user is the driver of this ride.
  // Only the driver needs full passenger contact info (phone, email) to
  // coordinate pickup. Any other authenticated user (fellow passenger, viewer)
  // only receives name and profile image.
  const isDriver =
    user &&
    (ride.driver?._id?.toString?.() === user.id || ride.driver?.toString?.() === user.id);

  // Exclude pickupPin — the driver must ask the passenger for it at pickup.
  const passengerFields = isDriver
    ? 'firstName lastName profileImage phone email averageRating'
    : 'firstName lastName profileImage averageRating';

  const bookings = await Booking.find({ ride: ride._id })
    .select('-pickupPin')
    .populate('passenger', passengerFields)
    .sort({ bookingStatus: 1, createdAt: -1 });

  return NextResponse.json(
    { status: 'success', data: { ride, bookings: bookings || [] } },
    { status: 200 }
  );
}, { protect: true, rateLimit: { name: 'rides-get-one', limit: 60, windowSeconds: 60 } });


