// @ts-nocheck
import { z } from 'zod';

export const rateBookingSchema = z.object({
  rating: z.number().min(1).max(5),
  reviewText: z.string().optional()
});
