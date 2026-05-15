import fp from 'fastify-plugin';
import { Server } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ─── Socket.IO Event Types ─────────────────────────
export interface ServerToClientEvents {
  new_message: (data: {
    id: string;
    chatId: string;
    senderId: string;
    content: string;
    type: string;
    mediaUrl?: string | null;
    createdAt: string;
    sender: { id: string; username: string; avatar: string | null };
  }) => void;
  typing: (data: { chatId: string; userId: string; username: string; isTyping: boolean }) => void;
  message_status: (data: { messageId: string; status: 'delivered' | 'read'; timestamp: string }) => void;
  user_online: (data: { userId: string }) => void;
  user_offline: (data: { userId: string; lastSeen: string }) => void;
  call_offer: (data: { callId: string; callerId: string; callerName: string; sdp: unknown }) => void;
  call_initiated: (data: { callId: string }) => void;  // sent back to caller with real callId
  call_answer: (data: { callId: string; sdp: unknown }) => void;
  ice_candidate: (data: { callId: string; candidate: unknown }) => void;
  call_reject: (data: { callId: string }) => void;
  call_end: (data: { callId: string }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  send_message: (data: { chatId: string; content: string; type?: string; replyToId?: string; mediaUrl?: string }) => void;
  typing_start: (data: { chatId: string }) => void;
  typing_stop: (data: { chatId: string }) => void;
  message_read: (data: { messageId: string }) => void;
  message_delivered: (data: { messageId: string }) => void;
  join_chat: (data: { chatId: string }) => void;
  leave_chat: (data: { chatId: string }) => void;
  call_offer: (data: { targetUserId: string; sdp: unknown }) => void;
  call_answer: (data: { callId: string; sdp: unknown }) => void;
  ice_candidate: (data: { callId: string; candidate: unknown }) => void;
  call_reject: (data: { callId: string }) => void;
  call_end: (data: { callId: string }) => void;
}

export interface SocketData {
  userId: string;
  username: string;
}

type PulseChatIO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

declare module 'fastify' {
  interface FastifyInstance {
    io: PulseChatIO;
  }
}

async function socketPlugin(fastify: FastifyInstance) {
  // Attach Socket.IO directly to Fastify's underlying HTTP server
  const io: PulseChatIO = new Server(fastify.server, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Decorate Fastify instance so `app.io` is available everywhere
  fastify.decorate('io', io);

  // Cleanup on server close
  fastify.addHook('onClose', async () => {
    io.close();
    logger.info('Socket.IO server closed');
  });

  logger.info('✅ Socket.IO attached to server');
}

export default fp(socketPlugin, {
  name: 'socket.io',
});
