import { z } from 'zod';

/**
 * Schema for creating a ride
 */
export const createRideSchema = z.object({
  body: z.object({
    vehicle: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Vehicle ID format'),
    source: z.string().min(2, 'Source must be at least 2 characters'),
    destination: z.string().min(2, 'Destination must be at least 2 characters'),
    departureTime: z.string().datetime('Invalid departure date-time format'),
    availableSeats: z.number().int().min(1, 'Must offer at least 1 seat'),
    pricePerSeat: z.number().min(0, 'Price per seat cannot be negative'),
  }).strict(),
});

/**
 * Schema for searching rides
 */
export const searchRidesSchema = z.object({
  query: z.object({
    source: z.string().optional(),
    destination: z.string().optional(),
    departureDate: z.string().optional(),
  }).strict(),
});
