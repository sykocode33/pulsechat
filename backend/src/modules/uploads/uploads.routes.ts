import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const UPLOAD_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export default async function uploadsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // ─── POST /uploads ───────────────────────────────
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ message: 'No file provided' });
      }

      // Validate file size (25MB)
      const MAX_SIZE = 25 * 1024 * 1024;
      const chunks: Buffer[] = [];
      let size = 0;

      for await (const chunk of data.file) {
        size += chunk.length;
        if (size > MAX_SIZE) {
          return reply.status(413).send({ message: 'File too large. Maximum 25MB.' });
        }
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      const ext = path.extname(data.filename) || '';
      const fileName = `${randomUUID()}${ext}`;
      const filePath = path.join(UPLOAD_DIR, fileName);

      // Write file to disk
      fs.writeFileSync(filePath, buffer);

      const url = `/api/uploads/files/${fileName}`;

      logger.info(`File uploaded: ${data.filename} -> ${fileName} (${(size / 1024).toFixed(1)}KB)`);

      return reply.send({
        url,
        fileName: data.filename,
        size,
        mimeType: data.mimetype,
      });
    } catch (err) {
      logger.error('Upload error:', err);
      return reply.status(500).send({ message: 'Upload failed' });
    }
  });

  // ─── GET /uploads/files/:filename — serve file ───
  app.get('/files/:filename', { preHandler: [] }, async (request: FastifyRequest<{ Params: { filename: string } }>, reply: FastifyReply) => {
    const filePath = path.join(UPLOAD_DIR, request.params.filename);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ message: 'File not found' });
    }

    const stream = fs.createReadStream(filePath);
    return reply.type('application/octet-stream').send(stream);
  });
}
