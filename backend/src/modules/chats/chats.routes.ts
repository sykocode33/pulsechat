import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import {
  createPrivateChatSchema,
  createGroupChatSchema,
  sendMessageSchema,
  getMessagesSchema,
  updateGroupSchema,
} from './chats.schema.js';
import * as chatsService from './chats.service.js';

export default async function chatsRoutes(app: FastifyInstance) {
  // All chat routes require authentication
  app.addHook('preHandler', authenticate);

  // ─── POST /chats/private ─────────────────────────
  app.post('/private', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = createPrivateChatSchema.parse(request.body);
      const chat = await chatsService.createPrivateChat(request.user.userId, body.targetUserId);
      return reply.status(201).send({ chat });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string; issues?: unknown };
      if (error.issues) return reply.status(400).send({ message: 'Validation error', errors: error.issues });
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });

  // ─── POST /chats/group ───────────────────────────
  app.post('/group', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = createGroupChatSchema.parse(request.body);
      const chat = await chatsService.createGroupChat(request.user.userId, body);
      return reply.status(201).send({ chat });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string; issues?: unknown };
      if (error.issues) return reply.status(400).send({ message: 'Validation error', errors: error.issues });
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });

  // ─── GET /chats ──────────────────────────────────
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const chats = await chatsService.getUserChats(request.user.userId);
      return reply.send({ chats });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });

  // ─── GET /chats/:id ─────────────────────────────
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const chat = await chatsService.getChatById(request.params.id, request.user.userId);
      return reply.send({ chat });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string };
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });

  // ─── POST /chats/:id/messages ────────────────────
  app.post('/:id/messages', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const body = sendMessageSchema.parse(request.body);
      const message = await chatsService.sendMessage(request.params.id, request.user.userId, body);
      return reply.status(201).send({ message });
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string; issues?: unknown };
      if (error.issues) return reply.status(400).send({ message: 'Validation error', errors: error.issues });
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });

  // ─── GET /chats/:id/messages ─────────────────────
  app.get('/:id/messages', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const query = getMessagesSchema.parse(request.query);
      const result = await chatsService.getMessages(request.params.id, request.user.userId, query);
      return reply.send(result);
    } catch (err: unknown) {
      const error = err as { statusCode?: number; message?: string; issues?: unknown };
      if (error.issues) return reply.status(400).send({ message: 'Validation error', errors: error.issues });
      return reply.status(error.statusCode || 500).send({ message: error.message || 'Internal server error' });
    }
  });
}
