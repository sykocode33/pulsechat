import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../plugins/socket.js';
import { prisma } from '../plugins/prisma.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

type PulseChatIO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type PulseChatSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

// Active calls map: callId -> { callerId, receiverId, startedAt }
const activeCalls = new Map<string, { callerId: string; receiverId: string; startedAt: Date }>();

export function setupCallHandlers(io: PulseChatIO, socket: PulseChatSocket) {
  const { userId, username } = socket.data;

  // ─── TURN Credentials (sent securely over authenticated socket) ──
  socket.on('get_turn_credentials', () => {
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      // Own TURN server
      {
        urls: [
          'turn:chat.ankitktool.site:3478?transport=tcp',
          'turn:chat.ankitktool.site:3478?transport=udp',
        ],
        username: 'pulsechat',
        credential: 'pulsechat_turn_secret',
      },
    ];

    // Add Metered TURN if configured (fallback for same-LAN/same-IP scenarios)
    const meteredUser = process.env.METERED_USERNAME;
    const meteredCred = process.env.METERED_CREDENTIAL;
    if (meteredUser && meteredCred) {
      iceServers.push({
        urls: [
          'turn:a.relay.metered.ca:80',
          'turn:a.relay.metered.ca:80?transport=tcp',
          'turn:a.relay.metered.ca:443',
          'turn:a.relay.metered.ca:443?transport=tcp',
        ],
        username: meteredUser,
        credential: meteredCred,
      });
    }

    socket.emit('turn_credentials', { iceServers });
  });

  // ─── Initiate Call ───────────────────────────────
  socket.on('call_offer', async (data) => {
    const { targetUserId, sdp } = data as { targetUserId: string; sdp: unknown };

    // Check if target user is online
    const callId = randomUUID();

    // Store active call
    activeCalls.set(callId, {
      callerId: userId,
      receiverId: targetUserId,
      startedAt: new Date(),
    });

    logger.info(`📞 Call initiated: ${username} → ${targetUserId} [${callId}]`);

    // ✅ Tell the CALLER their callId so they can use it for ICE candidates
    socket.emit('call_initiated', { callId });

    // Send offer to target user's room
    io.to(`user:${targetUserId}`).emit('call_offer', {
      callId,
      callerId: userId,
      callerName: username,
      sdp,
    });
  });

  // ─── Answer Call ─────────────────────────────────
  socket.on('call_answer', async (data) => {
    const { callId, sdp } = data as { callId: string; sdp: unknown };
    const call = activeCalls.get(callId);

    if (!call) {
      socket.emit('error', { message: 'Call not found' });
      return;
    }

    logger.info(`📞 Call answered: ${callId}`);

    // Send answer back to caller
    io.to(`user:${call.callerId}`).emit('call_answer', { callId, sdp });
  });

  // ─── ICE Candidate Exchange ───────────────────────
  socket.on('ice_candidate', (data) => {
    const { callId, candidate } = data as { callId: string; candidate: unknown };
    const call = activeCalls.get(callId);

    if (!call) return;

    // Forward to the other party
    const targetUserId = call.callerId === userId ? call.receiverId : call.callerId;
    io.to(`user:${targetUserId}`).emit('ice_candidate', { callId, candidate });
  });

  // ─── Reject Call ─────────────────────────────────
  socket.on('call_reject', async (data) => {
    const { callId } = data as { callId: string };
    const call = activeCalls.get(callId);

    if (!call) return;

    logger.info(`📞 Call rejected: ${callId}`);

    // Notify caller
    io.to(`user:${call.callerId}`).emit('call_reject', { callId });

    // Save call record as REJECTED
    await saveCallRecord(call.callerId, call.receiverId, 0, 'REJECTED').catch(() => {});
    activeCalls.delete(callId);
  });

  // ─── End Call ─────────────────────────────────────
  socket.on('call_end', async (data) => {
    const { callId } = data as { callId: string };
    const call = activeCalls.get(callId);

    if (!call) return;

    const duration = call.startedAt
      ? Math.floor((Date.now() - call.startedAt.getTime()) / 1000)
      : 0;

    logger.info(`📞 Call ended: ${callId} (${duration}s)`);

    // Notify the other party
    const targetUserId = call.callerId === userId ? call.receiverId : call.callerId;
    io.to(`user:${targetUserId}`).emit('call_end', { callId });

    // Save call record as ENDED
    await saveCallRecord(call.callerId, call.receiverId, duration, 'ENDED').catch(() => {});
    activeCalls.delete(callId);
  });

  // Clean up on disconnect
  socket.on('disconnect', async () => {
    // End any active call this user was in
    for (const [callId, call] of activeCalls.entries()) {
      if (call.callerId === userId || call.receiverId === userId) {
        const duration = Math.floor((Date.now() - call.startedAt.getTime()) / 1000);
        const targetUserId = call.callerId === userId ? call.receiverId : call.callerId;

        io.to(`user:${targetUserId}`).emit('call_end', { callId });

        await saveCallRecord(call.callerId, call.receiverId, duration, 'ENDED').catch(() => {});
        activeCalls.delete(callId);
      }
    }
  });
}

async function saveCallRecord(
  callerId: string,
  receiverId: string,
  duration: number,
  status: 'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'REJECTED'
) {
  try {
    await prisma.call.create({
      data: {
        callerId,
        receiverId,
        duration,
        status,
        endedAt: new Date(),
      },
    });
  } catch (err) {
    logger.error('Failed to save call record:', err);
  }
}
