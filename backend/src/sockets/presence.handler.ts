import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../plugins/socket.js';
import { prisma } from '../plugins/prisma.js';
import { logger } from '../utils/logger.js';

type PulseChatIO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type PulseChatSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function setupPresenceHandlers(io: PulseChatIO, socket: PulseChatSocket, redis: import('ioredis').default) {
  const { userId, username } = socket.data;

  // ─── Set Online ──────────────────────────────────
  (async () => {
    try {
      // Store in Redis with TTL (auto-expire if heartbeat stops)
      await redis.set(`online:${userId}`, socket.id, 'EX', 120);

      // Update DB
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true, lastSeen: new Date() },
      });

      // Notify all chats this user is in
      const memberships = await prisma.chatMember.findMany({
        where: { userId },
        select: { chatId: true },
      });

      for (const membership of memberships) {
        socket.to(`chat:${membership.chatId}`).emit('user_online', { userId });
      }

      logger.debug(`${username} is now online`);
    } catch (err) {
      logger.error('Error setting presence:', err);
    }
  })();

  // ─── Heartbeat (refresh Redis TTL) ───────────────
  const heartbeatInterval = setInterval(async () => {
    try {
      await redis.set(`online:${userId}`, socket.id, 'EX', 120);
    } catch (err) {
      logger.error('Heartbeat error:', err);
    }
  }, 60000); // Every 60 seconds

  socket.on('disconnect', () => {
    clearInterval(heartbeatInterval);
  });
}
