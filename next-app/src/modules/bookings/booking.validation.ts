// @ts-nocheck
import { z } from 'zod';

const locationSchema = z.object({
  address: z.string().min(1, 'Pickup address is required'),
  latitude: z.number({ required_error: 'Latitude is required' })
    .min(6.5, 'Latitude must be >= 6.5 (India bounds)')
    .max(35.7, 'Latitude must be <= 35.7 (India bounds)')
    .refine(val => val !== 0, 'Latitude cannot be exactly 0'),
  longitude: z.number({ required_error: 'Longitude is required' })
    .min(68.1, 'Longitude must be >= 68.1 (India bounds)')
    .max(97.4, 'Longitude must be <= 97.4 (India bounds)')
    .refine(val => val !== 0, 'Longitude cannot be exactly 0'),
  coordinates: z.array(z.number())
    .length(2, 'Coordinates must be exactly two numbers [longitude, latitude]')
    .refine((coords) => coords[0] >= 68.1 && coords[0] <= 97.4 && coords[0] !== 0, 'Longitude must be within India bounds (68.1 to 97.4)')
    .refine((coords) => coords[1] >= 6.5 && coords[1] <= 35.7 && coords[1] !== 0, 'Latitude must be within India bounds (6.5 to 35.7)')
    .optional(),
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

/**
 * Schema for a driver updating a booking's status.
 * The service enforces the allowed transitions on top of this.
 */
export const updateBookingStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'confirmed', 'cancelled', 'rejected', 'waitlisted'], {
      errorMap: () => ({ message: 'Invalid booking status' }),
    }),
  }),
});
