import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../plugins/socket.js';
import * as chatsService from '../modules/chats/chats.service.js';
import { logger } from '../utils/logger.js';

type PulseChatIO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type PulseChatSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function setupChatHandlers(io: PulseChatIO, socket: PulseChatSocket, redis: import('ioredis').default) {
  const { userId, username } = socket.data;

  // ─── Send Message ────────────────────────────────
  socket.on('send_message', async (data) => {
    try {
      const message = await chatsService.sendMessage(data.chatId, userId, {
        content: data.content,
        type: (data.type as 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE') || 'TEXT',
        replyToId: data.replyToId,
      });

      // Emit to all members in the chat room (including sender)
      io.to(`chat:${data.chatId}`).emit('new_message', {
        id: message.id,
        chatId: data.chatId,
        senderId: userId,
        content: message.content,
        type: message.type,
        createdAt: message.createdAt.toISOString(),
        sender: message.sender,
      });

      logger.debug(`Message sent by ${username} in chat ${data.chatId}`);
    } catch (err) {
      logger.error('Error sending message:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // ─── Typing Start ───────────────────────────────
  socket.on('typing_start', (data) => {
    socket.to(`chat:${data.chatId}`).emit('typing', {
      chatId: data.chatId,
      userId,
      username,
      isTyping: true,
    });
  });

  // ─── Typing Stop ────────────────────────────────
  socket.on('typing_stop', (data) => {
    socket.to(`chat:${data.chatId}`).emit('typing', {
      chatId: data.chatId,
      userId,
      username,
      isTyping: false,
    });
  });

  // ─── Message Read ───────────────────────────────
  socket.on('message_read', async (data) => {
    try {
      const message = await chatsService.markAsRead(data.messageId, userId);
      if (message && message.senderId !== userId) {
        // Notify the sender their message was read
        io.to(`user:${message.senderId}`).emit('message_status', {
          messageId: data.messageId,
          status: 'read',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      logger.error('Error marking message as read:', err);
    }
  });

  // ─── Message Delivered ──────────────────────────
  socket.on('message_delivered', async (data) => {
    try {
      const message = await chatsService.markAsDelivered(data.messageId, userId);
      if (message && message.senderId !== userId) {
        io.to(`user:${message.senderId}`).emit('message_status', {
          messageId: data.messageId,
          status: 'delivered',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      logger.error('Error marking message as delivered:', err);
    }
  });

  // ─── Join Chat Room ─────────────────────────────
  socket.on('join_chat', (data) => {
    socket.join(`chat:${data.chatId}`);
    logger.debug(`${username} joined chat room ${data.chatId}`);
  });

  // ─── Leave Chat Room ────────────────────────────
  socket.on('leave_chat', (data) => {
    socket.leave(`chat:${data.chatId}`);
    logger.debug(`${username} left chat room ${data.chatId}`);
  });
}
