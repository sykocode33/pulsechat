import { prisma } from '../../plugins/prisma.js';
import { logger } from '../../utils/logger.js';
import type { CreateGroupChatInput, SendMessageInput, GetMessagesInput } from './chats.schema.js';

// ─── Create or Get Private Chat ────────────────────
export async function createPrivateChat(userId: string, targetUserId: string) {
  if (userId === targetUserId) {
    throw { statusCode: 400, message: 'Cannot create chat with yourself' };
  }

  // Check if target user exists
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw { statusCode: 404, message: 'User not found' };
  }

  // Check if private chat already exists between these two users
  const existingChat = await prisma.chat.findFirst({
    where: {
      type: 'PRIVATE',
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, avatar: true, isOnline: true, lastSeen: true } } },
      },
    },
  });

  if (existingChat) {
    return existingChat;
  }

  // Create new private chat
  const chat = await prisma.chat.create({
    data: {
      type: 'PRIVATE',
      members: {
        create: [
          { userId, role: 'MEMBER' },
          { userId: targetUserId, role: 'MEMBER' },
        ],
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, avatar: true, isOnline: true, lastSeen: true } } },
      },
    },
  });

  logger.info(`Private chat created between ${userId} and ${targetUserId}`);
  return chat;
}

// ─── Create Group Chat ─────────────────────────────
export async function createGroupChat(userId: string, input: CreateGroupChatInput) {
  const { name, memberIds } = input;

  // Ensure creator is included
  const allMemberIds = [...new Set([userId, ...memberIds])];

  const chat = await prisma.chat.create({
    data: {
      type: 'GROUP',
      name,
      members: {
        create: allMemberIds.map((id) => ({
          userId: id,
          role: id === userId ? 'OWNER' : 'MEMBER',
        })),
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, username: true, avatar: true, isOnline: true, lastSeen: true } } },
      },
    },
  });

  logger.info(`Group chat "${name}" created by ${userId} with ${allMemberIds.length} members`);
  return chat;
}

// ─── Get User's Chats ──────────────────────────────
export async function getUserChats(userId: string) {
  const chats = await prisma.chat.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, username: true, avatar: true, isOnline: true, lastSeen: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: { select: { id: true, username: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Format response with last message and unread count
  const formattedChats = chats.map((chat) => ({
    id: chat.id,
    type: chat.type,
    name: chat.name,
    avatar: chat.avatar,
    members: chat.members,
    lastMessage: chat.messages[0] || null,
    updatedAt: chat.updatedAt,
  }));

  return formattedChats;
}

// ─── Get Chat by ID ────────────────────────────────
export async function getChatById(chatId: string, userId: string) {
  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      members: { some: { userId } },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true, avatar: true, bio: true, isOnline: true, lastSeen: true } },
        },
      },
    },
  });

  if (!chat) {
    throw { statusCode: 404, message: 'Chat not found' };
  }

  return chat;
}

// ─── Send Message ──────────────────────────────────
export async function sendMessage(chatId: string, senderId: string, input: SendMessageInput) {
  // Verify user is member of chat
  const membership = await prisma.chatMember.findFirst({
    where: { chatId, userId: senderId },
  });

  if (!membership) {
    throw { statusCode: 403, message: 'You are not a member of this chat' };
  }

  const message = await prisma.message.create({
    data: {
      chatId,
      senderId,
      content: input.content,
      type: input.type || 'TEXT',
      replyToId: input.replyToId,
      mediaUrl: input.mediaUrl,
    },
    include: {
      sender: { select: { id: true, username: true, avatar: true } },
      replyTo: {
        select: {
          id: true,
          content: true,
          sender: { select: { id: true, username: true } },
        },
      },
    },
  });

  // Update chat's updatedAt for sorting
  await prisma.chat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  return message;
}

// ─── Get Messages (Cursor-based Pagination) ────────
export async function getMessages(chatId: string, userId: string, query: GetMessagesInput) {
  // Verify membership
  const membership = await prisma.chatMember.findFirst({
    where: { chatId, userId },
  });

  if (!membership) {
    throw { statusCode: 403, message: 'You are not a member of this chat' };
  }

  const limit = query.limit || 30;

  const messages = await prisma.message.findMany({
    where: {
      chatId,
      ...(query.cursor ? { createdAt: { lt: (await prisma.message.findUnique({ where: { id: query.cursor } }))?.createdAt } } : {}),
    },
    include: {
      sender: { select: { id: true, username: true, avatar: true } },
      replyTo: {
        select: {
          id: true,
          content: true,
          sender: { select: { id: true, username: true } },
        },
      },
      reactions: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1, // Fetch one extra to determine if there are more
  });

  const hasMore = messages.length > limit;
  const results = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    messages: results,
    nextCursor,
    hasMore,
  };
}

// ─── Mark Message as Read ──────────────────────────
export async function markAsRead(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { chat: { include: { members: true } } },
  });

  if (!message) {
    throw { statusCode: 404, message: 'Message not found' };
  }

  // Only mark as read if user is a member and not the sender
  const isMember = message.chat.members.some((m) => m.userId === userId);
  if (!isMember) {
    throw { statusCode: 403, message: 'Not a member of this chat' };
  }

  if (message.senderId === userId) return message;

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { readAt: new Date() },
  });

  return updated;
}

// ─── Mark Message as Delivered ─────────────────────
export async function markAsDelivered(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { chat: { include: { members: true } } },
  });

  if (!message) return null;

  const isMember = message.chat.members.some((m) => m.userId === userId);
  if (!isMember || message.senderId === userId) return message;

  if (!message.deliveredAt) {
    return prisma.message.update({
      where: { id: messageId },
      data: { deliveredAt: new Date() },
    });
  }

  return message;
}
