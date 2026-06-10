import { z } from 'zod';

const locationSchema = z.object({
  address: z.string().min(1, 'Pickup address is required'),
  latitude: z.number({ required_error: 'Latitude is required' })
    .min(-90).max(90),
  longitude: z.number({ required_error: 'Longitude is required' })
    .min(-180).max(180),
  verified: z.boolean({ required_error: 'verified flag is required' }),
  provider: z.string().optional(),
  providerPlaceId: z.string().optional(),
});

/**
 * Schema for booking a ride.
 * pickupLocation is required with full coordinate object.
 * Backend service enforces verified === true on top of this.
 */
export const createBookingSchema = z.object({
  body: z.object({
    ride: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ride ID format'),
    seatsBooked: z.number().int().min(1, 'Must book at least 1 seat'),
    pickupAddress: z.string().min(2, 'Pickup address must be at least 2 characters'),
    pickupLocation: locationSchema,
  }),
});
