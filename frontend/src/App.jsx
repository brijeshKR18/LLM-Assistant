import { BrowserRouter as Router , Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage';
import OAuthCallback from './components/OAuthCallback';

import LoadingSpinner from './components/LoadingSpinner';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.02]">
            <div 
              className="absolute inset-0" 
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, rgba(99, 102, 241, 0.8) 1px, transparent 0)`,
                backgroundSize: '40px 40px'
              }}
            />
          </div>
          
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatProvider>
                    <ChatPage />
                  </ChatProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <ChatProvider>
                    <HistoryPage />
                  </ChatProvider>
                </ProtectedRoute>
              }
            />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/" element={<Navigate to="/chat" replace />} />
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(17, 24, 39, 0.95)',
                color: '#fff',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.75rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              },
              success: {
                style: {
                  background: 'rgba(16, 185, 129, 0.95)',
                  color: '#fff',
                },
              },
              error: {
                style: {
                  background: 'rgba(239, 68, 68, 0.95)',
                  color: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;