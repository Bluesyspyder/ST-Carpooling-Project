"use client";
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * useSocket — establishes an authenticated Socket.io connection for the logged-in user.
 *
 * @param {string|null} token    - JWT token from AuthContext (or localStorage)
 * @param {object}       handlers - map of { eventName: callbackFn }
 *
 * Usage:
 *   useSocket(token, {
 *     'booking:new':      (data) => showToast(data.message),
 *     'booking:accepted': (data) => showToast(data.message),
 *   });
 */
const useSocket = (token, handlers = {}) => {
  const socketRef = useRef(null);

  // Stable reference for handlers object so we don't reconnect on every render
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!token) return; // not logged in

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    // Register all provided event handlers
    const registerHandlers = () => {
      Object.entries(handlersRef.current).forEach(([event, cb]) => {
        socket.on(event, (data) => cb(data));
      });
    };
    registerHandlers();

    return () => {
      console.log('[Socket] Cleaning up connection');
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]); // only re-connect if token changes

  /**
   * Manually emit an event to the server.
   */
  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`[Socket] Cannot emit '${event}': socket not connected`);
    }
  }, []);

  return { emit };
};

export default useSocket;
