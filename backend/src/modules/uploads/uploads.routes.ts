import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { logger } from '../../utils/logger.js';
import { randomUUID, createHmac } from 'crypto';
import { env } from '../../config/env.js';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const UPLOAD_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// MIME type map
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.pdf': 'application/pdf', '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain', '.zip': 'application/zip', '.rar': 'application/x-rar-compressed',
};

// ─── Signed URL Helpers ────────────────────────────
const SIGNED_URL_SECRET = env.JWT_ACCESS_SECRET; // Reuse existing secret
const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

function generateSignedUrl(filename: string): string {
  const expires = Math.floor(Date.now() / 1000) + SIGNED_URL_EXPIRY;
  const signature = createHmac('sha256', SIGNED_URL_SECRET)
    .update(`${filename}:${expires}`)
    .digest('hex');

  return `/api/uploads/files/${filename}?expires=${expires}&sig=${signature}`;
}

function verifySignedUrl(filename: string, expires: string, signature: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  const expiryTime = parseInt(expires, 10);

  // Check expiry
  if (isNaN(expiryTime) || now > expiryTime) {
    return false;
  }

  // Verify signature
  const expected = createHmac('sha256', SIGNED_URL_SECRET)
    .update(`${filename}:${expires}`)
    .digest('hex');

  return signature === expected;
}

export default async function uploadsRoutes(app: FastifyInstance) {

  // ─── POST /uploads (Protected) ───────────────────
  app.post('/', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ message: 'No file provided' });
      }

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
      const ext = path.extname(data.filename).toLowerCase() || '';
      const fileName = `${randomUUID()}${ext}`;
      const filePath = path.join(UPLOAD_DIR, fileName);

      fs.writeFileSync(filePath, buffer);

      // Return a signed URL (expires in 1 hour)
      const url = generateSignedUrl(fileName);

      logger.info(`File uploaded: ${data.filename} -> ${fileName} (${(size / 1024).toFixed(1)}KB)`);

      return reply.send({
        url,
        fileName: data.filename,
        storedName: fileName,
        size,
        mimeType: data.mimetype,
      });
    } catch (err) {
      logger.error('Upload error:', err);
      return reply.status(500).send({ message: 'Upload failed' });
    }
  });

  // ─── GET /uploads/sign/:filename (Protected — refresh signed URL) ─
  app.get('/sign/:filename', { preHandler: [authenticate] }, async (request: FastifyRequest<{ Params: { filename: string } }>, reply: FastifyReply) => {
    const { filename } = request.params;
    const sanitized = path.basename(filename);
    const filePath = path.join(UPLOAD_DIR, sanitized);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ message: 'File not found' });
    }

    return reply.send({ url: generateSignedUrl(sanitized) });
  });

  // ─── GET /uploads/files/:filename (Signed URL required) ─
  app.get('/files/:filename', async (request: FastifyRequest<{ Params: { filename: string }; Querystring: { expires?: string; sig?: string } }>, reply: FastifyReply) => {
    const { filename } = request.params;
    const { expires, sig } = request.query as { expires?: string; sig?: string };

    // Verify signed URL
    if (!expires || !sig) {
      return reply.status(401).send({ message: 'Signed URL required' });
    }

    const sanitized = path.basename(filename);

    if (!verifySignedUrl(sanitized, expires, sig)) {
      return reply.status(403).send({ message: 'Invalid or expired link' });
    }

    const filePath = path.join(UPLOAD_DIR, sanitized);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ message: 'File not found' });
    }

    const ext = path.extname(sanitized).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    const stream = fs.createReadStream(filePath);
    return reply
      .header('Content-Type', mimeType)
      .header('Cache-Control', 'private, max-age=3600')
      .send(stream);
  });
}
