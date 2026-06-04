import { z } from 'zod';

/**
 * Register Request Validation Schema
 */
export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z
      .string()
      .email('Please enter a valid email address')
      .regex(/^[a-zA-Z0-9._%+-]+@st\.com$/, 'Email must end with @st.com'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().min(5, 'Please enter a valid phone number'),
    address: z.string().min(3, 'Address must be at least 3 characters'),
    role: z.enum(['passenger', 'driver']).default('passenger'),
    
    // Car Owner vehicle details (optional in base object, checked via refine)
    vehicleName: z.string().optional(),
    vehiclePlateNumber: z.string().optional(),
    vehicleType: z.enum(['diesel', 'petrol', 'ev']).optional(),
    mileage: z.coerce.number().min(0, 'Mileage must be a positive number').optional(),
    
    // Passenger/helpful optional fields
    emergencyContact: z.string().optional(),
    bio: z.string().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.role === 'driver') {
        return (
          !!data.vehicleName &&
          !!data.vehiclePlateNumber &&
          !!data.vehicleType &&
          data.mileage !== undefined
        );
      }
      return true;
    },
    {
      message: 'Vehicle name, plate number, type, and mileage are required for car owners',
      path: ['vehicleName'],
    }
  ),
});

/**
 * Login Request Validation Schema
 */
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Please enter a valid email address')
      .regex(/^[a-zA-Z0-9._%+-]+@st\.com$/, 'Email must end with @st.com'),
    password: z.string().min(1, 'Password is required'),
  }).strict(),
});
