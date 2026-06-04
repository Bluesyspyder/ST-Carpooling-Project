import { z } from 'zod';

/**
 * Schema for updating user profile
 */
export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
    phone: z.string().min(5, 'Phone number must be valid').optional(),
    profileImage: z.string().url('Invalid profile image URL').optional().or(z.literal('')),
  }).strict(),
});
