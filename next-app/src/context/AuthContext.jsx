"use client";
import { createContext, useState, useEffect } from 'react';
import api from '@/services/api';
import { initializePushNotifications } from '@/services/PushNotificationsService';

export const AuthContext = createContext(null);

const readPersistedUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const savedUser = localStorage.getItem('user');
  const savedToken = localStorage.getItem('token');

  if (!savedUser || !savedToken) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch (err) {
    console.error('Failed to parse persisted user details', err);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadedUser = readPersistedUser();
    setUser(loadedUser);
    if (loadedUser) {
      initializePushNotifications();
    }
  }, []);
  const loading = false; // No longer toggle global loading during auth operations

  /**
   * Log in user using email and password
   */
  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user: loggedInUser, token } = response.data.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    initializePushNotifications();
    return loggedInUser;
  };

  /**
   * Register a new user account
   */
  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    const { user: registeredUser, token } = response.data.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(registeredUser));
    setUser(registeredUser);
    return registeredUser;
  };

  /**
   * Log out active session
   */
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  /**
   * Update user context and persisted storage
   */
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, setUser: updateUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
