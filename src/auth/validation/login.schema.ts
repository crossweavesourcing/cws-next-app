import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address format.')
    .max(254, 'Email address must not exceed 254 characters.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(128, 'Password must not exceed 128 characters.'),
});

export type LoginPayload = z.infer<typeof loginSchema>;
