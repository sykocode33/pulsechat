import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema.js';
import * as authService from './auth.service.js';
import { authenticate } from '../../middleware/authenticate.js';

export default async function authRoutes(app: FastifyInstance) {

  // ─── POST /auth/register ─────────────────────────
  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);
      const result = await authService.register(body);

      return reply.status(201).send({
        message: 'Registration successful',
        ...result,
      });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string; issues?: unknown };
      if (error.issues) {
        // Zod validation error
        return reply.status(400).send({ message: 'Validation error', errors: error.issues });
      }
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });

  // ─── POST /auth/login ────────────────────────────
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);
      const result = await authService.login(body);

      return reply.send({
        message: 'Login successful',
        ...result,
      });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string; issues?: unknown };
      if (error.issues) {
        return reply.status(400).send({ message: 'Validation error', errors: error.issues });
      }
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });

  // ─── POST /auth/refresh ──────────────────────────
  app.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = refreshSchema.parse(request.body);
      const result = await authService.refresh(body.refreshToken);

      return reply.send({
        message: 'Token refreshed',
        ...result,
      });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string; issues?: unknown };
      if (error.issues) {
        return reply.status(400).send({ message: 'Validation error', errors: error.issues });
      }
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });

  // ─── POST /auth/logout ───────────────────────────
  app.post('/logout', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };

      if (!refreshToken) {
        return reply.status(400).send({ message: 'Refresh token is required' });
      }

      await authService.logout(refreshToken, request.user.userId);

      return reply.send({ message: 'Logged out successfully' });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });

  // ─── POST /auth/logout-all ───────────────────────
  app.post('/logout-all', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await authService.logoutAll(request.user.userId);
      return reply.send({ message: 'Logged out from all devices' });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });

  // ─── GET /auth/me ────────────────────────────────
  app.get('/me', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ user: request.user });
  });
}
