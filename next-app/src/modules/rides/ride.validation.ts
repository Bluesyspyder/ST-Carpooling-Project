// @ts-nocheck
import { z } from 'zod';

// Unified location object schema (reused in ride + booking validation)
const locationSchema = z.object({
  address: z.string().min(1, 'Location address is required'),
  latitude: z.number({ required_error: 'Latitude is required' })
    .min(6.5, 'Latitude must be >= 6.5 (India bounds)')
    .max(35.7, 'Latitude must be <= 35.7 (India bounds)')
    .refine(val => val !== 0, 'Latitude cannot be exactly 0'),
  longitude: z.number({ required_error: 'Longitude is required' })
    .min(68.1, 'Longitude must be >= 68.1 (India bounds)')
    .max(97.4, 'Longitude must be <= 97.4 (India bounds)')
    .refine(val => val !== 0, 'Longitude cannot be exactly 0'),
  verified: z.boolean({ required_error: 'verified flag is required' }),
  provider: z.string().optional(),
  providerPlaceId: z.string().optional(),
});

/**
 * Schema for creating a ride.
 * Both pickupLocation and destinationLocation are required with full coordinates.
 * Backend service enforces verified === true on top of this schema.
 */
export const createRideSchema = z.object({
  body: z.object({
    driverVehicle: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Vehicle ID format'),
    journeyDate: z.string().datetime('Invalid journey date format'),
    journeyTime: z.string().min(1, 'Journey time is required'),
    flexibilityMinutes: z.number().int().min(0).optional(),
    availableSeats: z.number().int().min(1, 'Must offer at least 1 seat'),
    pickupLocation: locationSchema,
    destinationLocation: locationSchema,
    notes: z.string().optional(),
  }),
});

/**
 * Schema for searching rides.
 * Accepts optional coordinate pairs for proximity-based matching.
 */
export const searchRidesSchema = z.object({
  query: z.object({
    journeyDate: z.string().optional(),
    pickupArea: z.string().optional(),
    pickupLat: z.union([z.string(), z.number()]).optional(),
    pickupLng: z.union([z.string(), z.number()]).optional(),
    driverName: z.string().optional(),
    seats: z.string().or(z.number()).optional(),
  }),
});
