import { z } from 'zod';

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  bio: z.string().max(200, 'Bio must be at most 200 characters').optional(),
  status: z.string().max(100, 'Status must be at most 100 characters').optional(),
  avatar: z.string().url('Avatar must be a valid URL').optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const searchUsersSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(50),
});
