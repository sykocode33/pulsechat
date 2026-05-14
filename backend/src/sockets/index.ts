import type { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../modules/auth/auth.service.js';
import { prisma } from '../plugins/prisma.js';
import { logger } from '../utils/logger.js';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../plugins/socket.js';
import { setupChatHandlers } from './chat.handler.js';
import { setupPresenceHandlers } from './presence.handler.js';
import { setupCallHandlers } from './call.handler.js';

type PulseChatIO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type PulseChatSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function setupSocketHandlers(io: PulseChatIO, redis: import('ioredis').default) {

  // ─── Authentication Middleware ────────────────────
  io.use(async (socket: PulseChatSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(token);
      socket.data.userId = decoded.userId;
      socket.data.username = decoded.username;

      next();
    } catch (err) {
      logger.debug('Socket auth failed:', err);
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ──────────────────────────
  io.on('connection', async (socket: PulseChatSocket) => {
    const { userId, username } = socket.data;
    logger.info(`🔌 Socket connected: ${username} (${socket.id})`);

    // Join user's personal room (for direct notifications)
    socket.join(`user:${userId}`);

    // Join all chat rooms the user belongs to
    try {
      const memberships = await prisma.chatMember.findMany({
        where: { userId },
        select: { chatId: true },
      });

      for (const membership of memberships) {
        socket.join(`chat:${membership.chatId}`);
      }

      logger.debug(`${username} joined ${memberships.length} chat rooms`);
    } catch (err) {
      logger.error('Error joining chat rooms:', err);
    }

    // Setup event handlers
    setupChatHandlers(io, socket, redis);
    setupPresenceHandlers(io, socket, redis);
    setupCallHandlers(io, socket);

    // ─── Disconnect ──────────────────────────────────
    socket.on('disconnect', async (reason) => {
      logger.info(`🔌 Socket disconnected: ${username} — ${reason}`);

      // Mark offline in Redis
      await redis.del(`online:${userId}`);

      // Update DB
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() },
      }).catch(() => {});

      // Notify contacts
      const memberships = await prisma.chatMember.findMany({
        where: { userId },
        select: { chatId: true },
      });

      for (const membership of memberships) {
        socket.to(`chat:${membership.chatId}`).emit('user_offline', {
          userId,
          lastSeen: new Date().toISOString(),
        });
      }
    });
  });
}
