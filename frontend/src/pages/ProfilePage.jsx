import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  UserIcon, 
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ClockIcon,
  SparklesIcon,
  CogIcon,
  BellIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = async () => {
    try {
      // Clear Google OAuth session completely
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
      }
      
      // Call logout
      await logout();
      
      // Close modal and navigate
      setShowLogoutModal(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate to login even if there's an error
      setShowLogoutModal(false);
      navigate('/login');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: UserIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'preferences', label: 'Preferences', icon: CogIcon },
  ];

  const stats = [
    { label: 'Days Active', value: '24', icon: CalendarIcon, color: 'violet' },
    { label: 'Total Conversations', value: '156', icon: ClockIcon, color: 'blue' },
    { label: 'Files Uploaded', value: '42', icon: DocumentTextIcon, color: 'emerald' },
    { label: 'AI Interactions', value: '1.2k', icon: SparklesIcon, color: 'amber' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-pink-500/10 via-rose-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        
        {/* Geometric Pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
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
      
      <div className="relative z-10">
        {/* Header */}
        <header className="glass-card border-b border-white/20 p-6 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05, x: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/chat')}
                className="p-3 glass-card border border-white/30 hover:border-violet-300 rounded-2xl transition-all duration-200 group"
              >
                <ArrowLeftIcon className="h-6 w-6 text-gray-700 group-hover:text-violet-700 transition-colors duration-200" />
              </motion.button>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Profile Dashboard</h1>
                <p className="text-gray-600 font-medium mt-1">Manage your account and preferences</p>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 glass-card border border-white/30 hover:border-blue-300 rounded-2xl transition-all duration-200 group"
              >
                <BellIcon className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 glass-card border border-white/30 hover:border-emerald-300 rounded-2xl transition-all duration-200 group"
              >
                <CogIcon className="h-5 w-5 text-gray-600 group-hover:text-emerald-600 transition-colors" />
              </motion.button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-6 space-y-8">
          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className="glass-card border border-white/30 rounded-3xl p-6 hover:border-white/50 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 bg-gradient-to-br from-${stat.color}-100 to-${stat.color}-200 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</div>
                  </div>
                </div>
                <p className="text-gray-700 font-semibold text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Profile Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Header Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card border border-white/30 rounded-3xl p-8 relative overflow-hidden"
              >
                {/* Background decoration */}
                <div className="absolute inset-0 opacity-[0.02] rounded-3xl overflow-hidden">
                  <div 
                    className="absolute inset-0" 
                    style={{
                      backgroundImage: `radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.8) 1px, transparent 0)`,
                      backgroundSize: '20px 20px'
                    }}
                  />
                </div>
                
                <div className="flex items-center space-x-6 relative z-10">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white shadow-2xl relative group">
                      <img
                        src={user?.picture}
                        alt={user?.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 w-10 h-10 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="text-4xl font-bold gradient-text mb-3">{user?.name}</h2>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <EnvelopeIcon className="h-5 w-5 text-gray-500" />
                        <span className="text-lg text-gray-700 font-medium">{user?.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="px-4 py-2 bg-gradient-to-r from-violet-100 to-purple-100 border border-violet-200 rounded-full">
                          <span className="text-sm font-bold text-violet-700">Google Account</span>
                        </div>
                        <div className="px-4 py-2 bg-gradient-to-r from-emerald-100 to-green-100 border border-emerald-200 rounded-full">
                          <span className="text-sm font-bold text-emerald-700">Premium User</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Tabs Navigation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card border border-white/30 rounded-2xl p-2"
              >
                <div className="flex space-x-1">
                  {tabs.map((tab) => (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-violet-600 hover:bg-violet-50'
                      }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      <span>{tab.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Account Information */}
                    <div className="glass-card border border-white/30 rounded-3xl p-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                        <UserIcon className="h-6 w-6 text-violet-600" />
                        <span>Account Information</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Full Name</label>
                            <p className="text-lg font-semibold text-gray-900 mt-1">{user?.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Email Address</label>
                            <p className="text-lg font-semibold text-gray-900 mt-1">{user?.email}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Account Type</label>
                            <p className="text-lg font-semibold text-gray-900 mt-1">Premium</p>
                          </div>
                          <div>
                            <label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Member Since</label>
                            <p className="text-lg font-semibold text-gray-900 mt-1">January 2025</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'security' && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="glass-card border border-white/30 rounded-3xl p-8"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                      <ShieldCheckIcon className="h-6 w-6 text-emerald-600" />
                      <span>Security Settings</span>
                    </h3>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-emerald-500 rounded-xl">
                            <ShieldCheckIcon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-emerald-800">Google OAuth</p>
                            <p className="text-sm text-emerald-600">Secure authentication enabled</p>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                          ACTIVE
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'preferences' && (
                  <motion.div
                    key="preferences"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="glass-card border border-white/30 rounded-3xl p-8"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                      <CogIcon className="h-6 w-6 text-blue-600" />
                      <span>Preferences</span>
                    </h3>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border border-gray-200 rounded-2xl">
                          <h4 className="font-semibold text-gray-900 mb-2">Language</h4>
                          <p className="text-gray-600">English (US)</p>
                        </div>
                        <div className="p-4 border border-gray-200 rounded-2xl">
                          <h4 className="font-semibold text-gray-900 mb-2">Time Zone</h4>
                          <p className="text-gray-600">UTC-5 (Eastern Time)</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column - Actions & Quick Info */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card border border-white/30 rounded-3xl p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/chat')}
                    className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 border border-violet-200 rounded-2xl transition-all duration-200 group"
                  >
                    <div className="p-2 bg-violet-500 rounded-xl group-hover:scale-110 transition-transform">
                      <SparklesIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-violet-700">Start New Chat</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/history')}
                    className="w-full flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border border-blue-200 rounded-2xl transition-all duration-200 group"
                  >
                    <div className="p-2 bg-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                      <ClockIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-blue-700">View History</span>
                  </motion.button>
                </div>
              </motion.div>

              {/* Sign Out Section */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-card border border-white/30 rounded-3xl p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Account Management</h3>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full flex items-center justify-center space-x-3 p-4 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 border border-red-200 hover:border-red-300 text-red-700 rounded-2xl transition-all duration-200 font-semibold shadow-sm hover:shadow-md group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <ArrowLeftIcon className="h-5 w-5 relative z-10" />
                  <span className="relative z-10">Sign Out</span>
                </motion.button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02] rounded-3xl overflow-hidden">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.8) 1px, transparent 0)`,
              backgroundSize: '20px 20px'
            }}
          />
        </div>
      </div>
      </div>
 
  );
};

export default ProfilePage;
