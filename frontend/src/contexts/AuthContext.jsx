import { createContext, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (googleUser) => {
    const userData = {
      id: googleUser.sub || uuidv4(),
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      sessionId: uuidv4(),
      createdAt: new Date().toISOString(),
      accessToken: googleUser.access_token,
      idToken: googleUser.id_token,
    };
    
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Initialize user's chat history if it doesn't exist
    const existingHistory = localStorage.getItem(`chatHistory_${userData.id}`);
    if (!existingHistory) {
      localStorage.setItem(`chatHistory_${userData.id}`, JSON.stringify([]));
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint to clear session
      await axios.post('http://localhost:8000/auth/logout', {}, {
        withCredentials: true
      });
    } catch (error) {
      console.error('Error logging out from backend:', error);
    }
    
    // Clear local state and localStorage
    setUser(null);
    localStorage.removeItem('user');
    
    // Clear any cached user data in the browser
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
      window.google.accounts.id.cancel();
    }
    
    // Note: We keep chat history even after logout for when user logs back in
  };

  const value = {
    user,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
