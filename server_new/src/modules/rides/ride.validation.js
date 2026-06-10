import { z } from 'zod';

// Unified location object schema (reused in ride + booking validation)
const locationSchema = z.object({
  address: z.string().min(1, 'Location address is required'),
  latitude: z.number({ required_error: 'Latitude is required' })
    .min(-90, 'Latitude must be >= -90')
    .max(90, 'Latitude must be <= 90'),
  longitude: z.number({ required_error: 'Longitude is required' })
    .min(-180, 'Longitude must be >= -180')
    .max(180, 'Longitude must be <= 180'),
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
    vehicle: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Vehicle ID format'),
    source: z.string().min(2, 'Source must be at least 2 characters'),
    destination: z.string().min(2, 'Destination must be at least 2 characters'),
    departureTime: z.string().datetime('Invalid departure date-time format'),
    availableSeats: z.number().int().min(1, 'Must offer at least 1 seat'),
    pricePerSeat: z.number().min(0, 'Price per seat cannot be negative'),
    pickupLocation: locationSchema,
    destinationLocation: locationSchema,
  }),
});

/**
 * Schema for searching rides.
 * Accepts optional coordinate pairs for proximity-based matching.
 */
export const searchRidesSchema = z.object({
  query: z.object({
    source: z.string().optional(),
    destination: z.string().optional(),
    departureDate: z.string().optional(),
    sourceLat: z.string().or(z.number()).optional(),
    sourceLng: z.string().or(z.number()).optional(),
    destLat: z.string().or(z.number()).optional(),
    destLng: z.string().or(z.number()).optional(),
    seats: z.string().or(z.number()).optional(),
  }),
});
