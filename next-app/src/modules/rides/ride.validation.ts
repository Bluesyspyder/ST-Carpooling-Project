// @ts-nocheck
import { z } from 'zod';
import { OPERATIONAL_BOUNDS } from '@/lib/geofence';

// Unified location object schema (reused in ride + booking validation)
const locationSchema = z.object({
  address: z.string().min(1, 'Location address is required'),
  latitude: z.number({ required_error: 'Latitude is required' })
    .min(OPERATIONAL_BOUNDS.minLat, `Latitude must be >= ${OPERATIONAL_BOUNDS.minLat} (India bounds)`)
    .max(OPERATIONAL_BOUNDS.maxLat, `Latitude must be <= ${OPERATIONAL_BOUNDS.maxLat} (India bounds)`)
    .refine(val => val !== 0, 'Latitude cannot be exactly 0'),
  longitude: z.number({ required_error: 'Longitude is required' })
    .min(OPERATIONAL_BOUNDS.minLng, `Longitude must be >= ${OPERATIONAL_BOUNDS.minLng} (India bounds)`)
    .max(OPERATIONAL_BOUNDS.maxLng, `Longitude must be <= ${OPERATIONAL_BOUNDS.maxLng} (India bounds)`)
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
    destinationLat: z.union([z.string(), z.number()]).optional(),
    destinationLng: z.union([z.string(), z.number()]).optional(),
    radiusKm: z.union([z.string(), z.number()]).optional(),
    driverName: z.string().optional(),
    seats: z.string().or(z.number()).optional(),
  }),
});

/**
 * Schema for a driver updating their own ride's lifecycle status.
 */
export const updateRideStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'FULL', 'FROZEN', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED']),
  }),
});
