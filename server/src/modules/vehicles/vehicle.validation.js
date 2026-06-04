import { z } from 'zod';

/**
 * Schema for registering a new vehicle
 */
export const createVehicleSchema = z.object({
  body: z.object({
    vehicleName: z.string().min(1, 'Vehicle name is required'),
    vehiclePlateNumber: z.string().min(3, 'Vehicle plate number must be valid'),
    vehicleType: z.enum(['diesel', 'petrol', 'ev']),
    mileage: z.coerce.number().min(0, 'Mileage must be a positive number'),
    seatCount: z.coerce.number().int().min(1, 'Seat count must be at least 1').max(10, 'Seat count cannot exceed 10').default(4),
  }).strict(),
});
