import { z } from 'zod';

export const signupSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  // Optional like the settings-page profile editor: mononyms are real, and
  // requiring a last name would lock those users out of signing up.
  last_name: z.string(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['student', 'parent', 'tutor']),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
