import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../modules/auth/auth.service.js';
import { logger } from '../utils/logger.js';

// ─── Extend Fastify Request Type ───────────────────
declare module 'fastify' {
  interface FastifyRequest {
    user: {
      userId: string;
      email: string;
      username: string;
      role: string;
    };
  }
}

// ─── Auth Middleware (preHandler hook) ──────────────
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    request.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
    };
  } catch (err) {
    logger.debug('Auth failed:', err);
    return reply.status(401).send({ message: 'Invalid or expired token' });
  }
}

// ─── Admin-Only Middleware ─────────────────────────
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (request.user.role !== 'ADMIN') {
    return reply.status(403).send({ message: 'Admin access required' });
  }
}
