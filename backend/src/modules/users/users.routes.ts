import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { updateProfileSchema, searchUsersSchema } from './users.schema.js';
import * as usersService from './users.service.js';

export default async function usersRoutes(app: FastifyInstance) {
  // All user routes require authentication
  app.addHook('preHandler', authenticate);

  // ─── GET /users/me ───────────────────────────────
  app.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await usersService.getUserById(request.user.userId);
      return reply.send({ user });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });

  // ─── PUT /users/me ───────────────────────────────
  app.put('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = updateProfileSchema.parse(request.body);
      const user = await usersService.updateProfile(request.user.userId, body);
      return reply.send({ message: 'Profile updated', user });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string; issues?: unknown };
      if (error.issues) {
        return reply.status(400).send({ message: 'Validation error', errors: error.issues });
      }
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });

  // ─── GET /users/search?q=query ───────────────────
  app.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { q } = searchUsersSchema.parse(request.query);
      const users = await usersService.searchUsers(q, request.user.userId);
      return reply.send({ users });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string; issues?: unknown };
      if (error.issues) {
        return reply.status(400).send({ message: 'Validation error', errors: error.issues });
      }
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });

  // ─── GET /users/:id ──────────────────────────────
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const user = await usersService.getUserById(request.params.id);
      return reply.send({ user });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });
}
