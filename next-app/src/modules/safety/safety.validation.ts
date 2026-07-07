// @ts-nocheck
import { z } from 'zod';

export const createSosAlertSchema = z.object({
  body: z.object({
    rideId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ride ID format').optional(),
    triggeredBy: z.enum(['driver', 'passenger']).optional(),
    message: z.string().max(500).optional(),
    location: z
      .object({
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
      })
      .nullable()
      .optional(),
  }),
});
