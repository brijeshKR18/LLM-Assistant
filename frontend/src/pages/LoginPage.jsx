import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/outline';
import GoogleSignInButton from '../components/GoogleSignInButton';
// import EnvDebug from '../components/EnvDebug';

const LoginPage = () => {
  const { user, loading } = useAuth();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/chat" replace />;
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center relative p-4 overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-r from-pink-500/15 to-rose-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        
        {/* Geometric Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `
                linear-gradient(90deg, transparent 79px, rgba(99, 102, 241, 0.3) 81px, rgba(99, 102, 241, 0.3) 82px, transparent 84px),
                linear-gradient(0deg, transparent 79px, rgba(99, 102, 241, 0.3) 81px, rgba(99, 102, 241, 0.3) 82px, transparent 84px)
              `,
              backgroundSize: '80px 80px'
            }}
          />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="w-full max-w-md mx-auto px-4 relative z-10">
        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isAnimating ? 1 : 0, y: isAnimating ? 0 : 20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full"
        >
          <div className="glass-card rounded-3xl shadow-2xl border border-white/30 p-12 relative overflow-hidden">
            {/* Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500"></div>
            
            {/* Floating Elements */}
            <div className="absolute top-6 right-6 w-16 h-16 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-2xl blur-xl"></div>
            <div className="absolute bottom-6 left-6 w-12 h-12 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl blur-lg"></div>
            
            <div className="text-center mb-12 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                animate={{ opacity: isAnimating ? 1 : 0, scale: isAnimating ? 1 : 0.5, rotate: isAnimating ? 0 : -180 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 rounded-3xl mb-8 shadow-2xl relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 rounded-3xl blur-xl opacity-50"></div>
                <SparklesIcon className="h-12 w-12 text-white relative z-10" />
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isAnimating ? 1 : 0, y: isAnimating ? 0 : 20 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent mb-3"
              >
                Welcome to Kuberox
              </motion.h1>
              
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isAnimating ? 1 : 0, y: isAnimating ? 0 : 20 }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                className="text-xl font-semibold gradient-text mb-4"
              >
                LLM Assistant
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isAnimating ? 1 : 0, y: isAnimating ? 0 : 20 }}
                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                className="text-gray-600 text-lg leading-relaxed font-medium"
              >
                Your intelligent companion for enhanced productivity
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isAnimating ? 1 : 0, y: isAnimating ? 0 : 30 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              className="space-y-6"
            >
              <GoogleSignInButton />
            </motion.div>
          </div>
        </motion.div>
      </div>
      
      {/* Temporary Debug Component - Remove in production */}
      {/* {import.meta.env.DEV && <EnvDebug />} */}
    </div>
  );
};

export default LoginPage;
