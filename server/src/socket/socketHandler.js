import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

/**
 * Initialize Socket.io with the HTTP server.
 * Authenticates connections via JWT in the handshake auth object.
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error: no token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      console.error('[SOCKET] JWT verification failed:', err.message);
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] User ${socket.userId} connected (${socket.id})`);

    // Each user joins their own private room (userId-based)
    socket.join(`user:${socket.userId}`);

    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] User ${socket.userId} disconnected: ${reason}`);
    });

    socket.on('error', (err) => {
      console.error(`[SOCKET] Socket error for user ${socket.userId}:`, err);
    });
  });

  console.log('[SOCKET] Socket.io initialized');
  return io;
};

/**
 * Get the singleton Socket.io server instance.
 * Returns null if not yet initialized.
 * @returns {import('socket.io').Server | null}
 */
export const getIO = () => io;

/**
 * Emit a notification event to a specific user by their userId.
 *
 * @param {string} userId - MongoDB user ID string
 * @param {string} event  - Event name (e.g. 'booking:new', 'booking:accepted')
 * @param {object} payload - Data payload to send
 */
export const emitToUser = (userId, event, payload) => {
  if (!io) {
    console.warn(`[SOCKET] Attempted to emit '${event}' but socket.io is not initialized`);
    return;
  }
  io.to(`user:${userId}`).emit(event, payload);
};
