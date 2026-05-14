import { z } from 'zod';

// ─── Create Private Chat ──────────────────────────
export const createPrivateChatSchema = z.object({
  targetUserId: z.string().uuid('Invalid user ID'),
});

// ─── Create Group Chat ────────────────────────────
export const createGroupChatSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(50),
  memberIds: z
    .array(z.string().uuid())
    .min(1, 'At least one member is required')
    .max(100, 'Maximum 100 members'),
});

// ─── Send Message ─────────────────────────────────
export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000),
  type: z.enum(['TEXT', 'IMAGE', 'FILE', 'VOICE']).default('TEXT'),
  replyToId: z.string().uuid().optional(),
  mediaUrl: z.string().url().optional(),
});

// ─── Get Messages Query ───────────────────────────
export const getMessagesSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(30),
});

// ─── Update Group ─────────────────────────────────
export const updateGroupSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  avatar: z.string().url().optional(),
});

// ─── Add/Remove Members ───────────────────────────
export const memberActionSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type CreatePrivateChatInput = z.infer<typeof createPrivateChatSchema>;
export type CreateGroupChatInput = z.infer<typeof createGroupChatSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
