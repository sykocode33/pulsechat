import fp from 'fastify-plugin';
import fastifySocketIO from 'fastify-socket.io';
import type { FastifyInstance } from 'fastify';
import type { Server, ServerOptions } from 'socket.io';
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
    createdAt: string;
    sender: { id: string; username: string; avatar: string | null };
  }) => void;
  typing: (data: { chatId: string; userId: string; username: string; isTyping: boolean }) => void;
  message_status: (data: { messageId: string; status: 'delivered' | 'read'; timestamp: string }) => void;
  user_online: (data: { userId: string }) => void;
  user_offline: (data: { userId: string; lastSeen: string }) => void;
  call_offer: (data: { callId: string; callerId: string; callerName: string; sdp: RTCSessionDescriptionInit }) => void;
  call_answer: (data: { callId: string; sdp: RTCSessionDescriptionInit }) => void;
  ice_candidate: (data: { callId: string; candidate: RTCIceCandidateInit }) => void;
  call_reject: (data: { callId: string }) => void;
  call_end: (data: { callId: string }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  send_message: (data: { chatId: string; content: string; type?: string; replyToId?: string }) => void;
  typing_start: (data: { chatId: string }) => void;
  typing_stop: (data: { chatId: string }) => void;
  message_read: (data: { messageId: string }) => void;
  message_delivered: (data: { messageId: string }) => void;
  join_chat: (data: { chatId: string }) => void;
  leave_chat: (data: { chatId: string }) => void;
  call_offer: (data: { targetUserId: string; sdp: RTCSessionDescriptionInit }) => void;
  call_answer: (data: { callId: string; sdp: RTCSessionDescriptionInit }) => void;
  ice_candidate: (data: { callId: string; candidate: RTCIceCandidateInit }) => void;
  call_reject: (data: { callId: string }) => void;
  call_end: (data: { callId: string }) => void;
}

export interface SocketData {
  userId: string;
  username: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
  }
}

async function socketPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifySocketIO, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  } as Partial<ServerOptions>);

  logger.info('✅ Socket.IO plugin registered');
}

export default fp(socketPlugin, {
  name: 'socket.io',
});
