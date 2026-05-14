import type { FastifyInstance } from 'fastify';
import { prisma } from '../../plugins/prisma.js';

export default async function healthRoutes(app: FastifyInstance) {
  // ─── Health Check ────────────────────────────────
  app.get('/health', async (_request, reply) => {
    const checks: Record<string, string> = {
      server: 'ok',
      database: 'unknown',
      redis: 'unknown',
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // Check Redis
    try {
      const pong = await app.redis.ping();
      checks.redis = pong === 'PONG' ? 'ok' : 'error';
    } catch {
      checks.redis = 'error';
    }

    const allHealthy = Object.values(checks).every((v) => v === 'ok');

    return reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // ─── Server Info ─────────────────────────────────
  app.get('/info', async (_request, reply) => {
    return reply.send({
      name: 'PulseChat API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });
}
