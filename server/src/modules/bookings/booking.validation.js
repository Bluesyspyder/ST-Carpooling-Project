import { z } from 'zod';

/**
 * Schema for booking a ride
 */
export const createBookingSchema = z.object({
  body: z.object({
    ride: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ride ID format'),
    seatsBooked: z.number().int().min(1, 'Must book at least 1 seat'),
    pickupAddress: z.string().min(2, 'Pickup address must be at least 2 characters'),
    pickupLocation: z.object({
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      confirmed: z.boolean().optional(),
      manual: z.boolean().optional(),
    }).optional(),
  }).strict(),
});
