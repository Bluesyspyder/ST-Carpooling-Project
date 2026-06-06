import { useState } from 'react';
import api from '../services/api.js';
import { AuthContext } from './AuthContext.js';

const readPersistedUser = () => {
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
  const [user, setUser] = useState(readPersistedUser);
  const [loading, setLoading] = useState(false);

  /**
   * Log in user using email and password
   */
  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: loggedInUser, token } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register a new user account
   */
  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', userData);
      const { user: registeredUser, token } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(registeredUser));
      setUser(registeredUser);
      return registeredUser;
    } finally {
      setLoading(false);
    }
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
