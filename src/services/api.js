import axios from 'axios';

import { Capacitor } from '@capacitor/core';

// Dynamically determine the base URL.
// Native (Capacitor) builds are static exports with no local API routes, so they
// MUST point at the deployed backend — never fall back to localhost, which
// resolves to the phone itself and silently breaks every request.
const isNative = Capacitor.isNativePlatform();

export const API_BASE_URL = isNative
  ? process.env.NEXT_PUBLIC_PROD_API_URL
  : (process.env.NEXT_PUBLIC_API_URL || '/api/v1');

if (isNative && !API_BASE_URL) {
  console.error(
    '[api] NEXT_PUBLIC_PROD_API_URL is not set — native builds cannot reach the backend. ' +
    'This build was produced without the required env var and must be rebuilt.'
  );
}

// Base URL for the Socket.IO server, derived from the same source of truth
// (strip the trailing /api/v1 API path, socket.io connects to the origin).
export const SOCKET_URL = API_BASE_URL ? API_BASE_URL.replace(/\/api(\/v\d+)?\/?$/, '') : null;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token into requests headers automatically, and log every
// outgoing request so network issues (wrong URL, unreachable host) are visible in device logs.
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    config.metadata = { startTime: Date.now() };
    console.log(`[api] → ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url}`);
    return config;
  },
  (error) => {
    console.error('[api] Request setup failed:', error.message);
    return Promise.reject(error);
  }
);

// Interceptor to log every response/error and catch 401 authorization failures
api.interceptors.response.use(
  (response) => {
    const elapsed = Date.now() - (response.config.metadata?.startTime || Date.now());
    console.log(`[api] ← ${response.status} ${response.config.url} (${elapsed}ms)`);
    return response;
  },
  (error) => {
    const config = error.config || {};
    const elapsed = Date.now() - (config.metadata?.startTime || Date.now());

    if (error.response) {
      console.error(`[api] ← ${error.response.status} ${config.url} (${elapsed}ms)`, error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      console.error(`[api] ✗ Timeout after ${elapsed}ms: ${config.url}`);
    } else {
      // No response at all — DNS failure, connection refused, CORS block, offline, etc.
      console.error(`[api] ✗ Network error (no response) after ${elapsed}ms: ${config.baseURL || ''}${config.url}`, error.message);
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // If window object exists, reload page to trigger auth state reset ONLY if not already on login/register page
      if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
