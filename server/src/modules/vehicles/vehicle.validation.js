import { z } from 'zod';

/**
 * Schema for registering a new vehicle
 */
export const createVehicleSchema = z.object({
  body: z.object({
    make: z.string().min(1, 'Vehicle make is required'),
    model: z.string().min(1, 'Vehicle model is required'),
    year: z.number().int().min(1990, 'Year must be 1990 or newer'),
    registrationNumber: z.string().min(3, 'Registration number must be valid'),
    seatCount: z.number().int().min(1, 'Seat count must be at least 1').max(10, 'Seat count cannot exceed 10'),
  }).strict(),
});
