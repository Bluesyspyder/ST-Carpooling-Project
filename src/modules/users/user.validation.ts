// @ts-nocheck
import { z } from 'zod';

/**
 * Schema for updating user profile
 */
export const updateProfileSchema = z.object({
  body: z.object({
    firstName:        z.string().min(2, 'First name must be at least 2 characters').optional(),
    lastName:         z.string().min(2, 'Last name must be at least 2 characters').optional(),
    phone:            z.string().min(5, 'Phone number must be valid').optional(),
    address:          z.string().min(2, 'Address must be at least 2 characters').optional(),
    role: z.enum(['passenger', 'hybrid']).optional(),
    bio:              z.string().max(300, 'Bio cannot exceed 300 characters').optional(),
    emergencyContact: z.string().optional(),
    profileImage:     z.string().url('Invalid profile image URL').optional().or(z.literal('')),
    homeLocation: z.object({
      address:   z.string().optional(),
      latitude:  z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      verified:  z.boolean().optional(),
    }).optional(),
  }),
});

export const addSavedAddressSchema = z.object({
  body: z.object({
    label: z.string().min(1, 'Label is required'),
    icon: z.string().optional(),
    address: z.string().min(2, 'Address must be at least 2 characters'),
    latitude: z.number({ required_error: 'Latitude is required' }),
    longitude: z.number({ required_error: 'Longitude is required' }),
    isDefault: z.boolean().optional(),
    verified: z.boolean().optional(),
    provider: z.string().optional(),
    providerPlaceId: z.string().optional(),
  }).strict(),
});

export const updateSavedAddressSchema = z.object({
  body: z.object({
    label: z.string().min(1, 'Label is required').optional(),
    icon: z.string().optional(),
    address: z.string().min(2, 'Address must be at least 2 characters').optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    isDefault: z.boolean().optional(),
    verified: z.boolean().optional(),
    provider: z.string().optional(),
    providerPlaceId: z.string().optional(),
  }).strict(),
});
