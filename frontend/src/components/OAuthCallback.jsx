import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const auth = searchParams.get('auth');
        const errorParam = searchParams.get('error');

        if (errorParam || auth === 'error') {
          setError(`OAuth error: ${errorParam || 'Authentication failed'}`);
          setStatus('error');
          return;
        }

        if (auth === 'success') {
          // Get user data from backend session
          const response = await axios.get(`http://localhost:8000/auth/user`, {
            withCredentials: true
          });

          if (response.data && response.data.authenticated && response.data.user) {
            // Login with user data
            await login(response.data.user);
            setStatus('success');
            
            // Redirect to chat page after successful login
            setTimeout(() => {
              navigate('/chat');
            }, 1000);
          } else {
            setError('No user session found');
            setStatus('error');
          }
        } else {
          setError('Invalid callback parameters');
          setStatus('error');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setError(`Authentication failed: ${error.response?.data?.detail || error.message}`);
        setStatus('error');
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, login]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing sign-in...</h2>
          <p className="text-gray-600">Please wait while we finish setting up your account.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign-in successful!</h2>
          <p className="text-gray-600">Redirecting you to the chat...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign-in failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default OAuthCallback;
