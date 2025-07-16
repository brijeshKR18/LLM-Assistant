import { useState } from 'react';
import { motion } from 'framer-motion';

const GoogleSignInButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    // Redirect to backend OAuth login endpoint
    window.location.href = 'http://localhost:8000/auth/login';
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="w-full flex justify-center items-center px-6 py-4 glass-card rounded-2xl shadow-lg hover:shadow-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden group"
    >
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {isLoading ? (
        <div className="flex items-center space-x-3 relative z-10">
          <div className="loading-dots">
            <div className="bg-violet-600"></div>
            <div className="bg-purple-600"></div>
            <div className="bg-blue-600"></div>
          </div>
          <span>Connecting...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-3 relative z-10">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Continue with Google</span>
        </div>
      )}
    </motion.button>
  );
};

export default GoogleSignInButton;
