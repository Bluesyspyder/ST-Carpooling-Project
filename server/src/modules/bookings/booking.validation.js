import { z } from 'zod';

/**
 * Schema for booking a ride
 */
export const createBookingSchema = z.object({
  body: z.object({
    ride: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ride ID format'),
    seatsBooked: z.number().int().min(1, 'Must book at least 1 seat'),
  }).strict(),
});
