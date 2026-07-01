import axios from 'axios';

import { Capacitor } from '@capacitor/core';

// Dynamically determine the base URL
const isNative = Capacitor.isNativePlatform();
const API_BASE_URL = isNative 
  ? (process.env.NEXT_PUBLIC_PROD_API_URL || 'http://localhost:3000/api/v1') 
  : (process.env.NEXT_PUBLIC_API_URL || '/api/v1');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token into requests headers automatically
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to catch 401 authorization failures
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
