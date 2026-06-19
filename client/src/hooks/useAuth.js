import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

/**
 * Access user details and auth controllers
 * @returns {object} AuthContext values (user, loading, login, register, logout)
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
