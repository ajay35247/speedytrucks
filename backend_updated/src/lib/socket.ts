import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { verifyAccessToken } from './jwt';
import { env } from '../config/env';

let io: Server | null = null;

function buildSocketCorsOrigin() {
  if (env.socketCorsOrigin === '*') return true;
  const allowedOrigins = env.socketCorsOrigin.split(',').map((item) => item.trim()).filter(Boolean);
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Socket origin not allowed'));
  };
}

export async function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: buildSocketCorsOrigin(),
      credentials: true,
    },
  });

  const pubClient = createClient({ url: env.redisUrl });
  const subClient = pubClient.duplicate();
  await pubClient.connect();
  await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    try {
      const rawToken = String(socket.handshake.auth?.token || socket.handshake.headers.authorization || '');
      const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;
      if (!token) return next(new Error('Unauthorized'));
      const user = verifyAccessToken(token);
      socket.data.user = user;
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { id: string; role: string };
    socket.join(`user:${user.id}`);

    socket.on('location:subscribe', (tripId: string) => {
      socket.join(`trip:${tripId}`);
    });

    socket.on('location:unsubscribe', (tripId: string) => {
      socket.leave(`trip:${tripId}`);
    });
  });

  return io;
}

export function getIo() {
  return io;
}

export function emitTripLocationUpdate(payload: Record<string, unknown> & { tripId: string; driverUserId?: string }) {
  if (!io) return;
  io.to(`trip:${payload.tripId}`).emit('location:update', payload);
  if (payload.driverUserId) io.to(`user:${payload.driverUserId}`).emit('location:update', payload);
}
