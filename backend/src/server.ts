import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import redisPlugin from './plugins/redis.js';
import socketPlugin from './plugins/socket.js';
import { prisma } from './plugins/prisma.js';
import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import chatsRoutes from './modules/chats/chats.routes.js';
import { setupSocketHandlers } from './sockets/index.js';

// ─── Build Server ──────────────────────────────────
async function buildServer() {
  const app = Fastify({
    logger: false, // Using Winston instead
    trustProxy: true,
  });

  // ─── Security Plugins ────────────────────────────
  await app.register(cors, {
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // Managed by Nginx in production
  });

  await app.register(cookie, {
    secret: env.JWT_REFRESH_SECRET,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // ─── Infrastructure Plugins ──────────────────────
  await app.register(redisPlugin);
  await app.register(socketPlugin);

  // ─── Routes ──────────────────────────────────────
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(chatsRoutes, { prefix: '/api/chats' });

  // ─── Socket.IO Handlers ──────────────────────────
  app.ready().then(() => {
    setupSocketHandlers(app.io, app.redis);
    logger.info('📡 Socket.IO handlers initialized');
  });

  return app;
}

// ─── Start Server ──────────────────────────────────
async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    const app = await buildServer();

    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`🚀 PulseChat API running on http://localhost:${env.PORT}`);
    logger.info(`📡 Socket.IO ready on ws://localhost:${env.PORT}`);
    logger.info(`🔧 Environment: ${env.NODE_ENV}`);

    // ─── Graceful Shutdown ───────────────────────────
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info(`\n${signal} received. Shutting down gracefully...`);
        await app.close();
        await prisma.$disconnect();
        logger.info('✅ Server shut down');
        process.exit(0);
      });
    }
  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
