import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  XMarkIcon, 
  ChatBubbleLeftIcon,
  UserIcon,
  ClockIcon,
  DocumentTextIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const Sidebar = ({ onClose }) => {
  const { user, logout } = useAuth();
  const { chatHistory, currentChat, startNewChat, loadChat, deleteChat, deleteAllChats } = useChat();
  const navigate = useNavigate();
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      setShowLogoutConfirm(false);
      navigate('/login');
    }
  };

  const handleDeleteAll = () => {
    deleteAllChats();
    setShowDeleteAllConfirm(false);
  };

  const handleDeleteChat = (chatId, e) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  const handleChatClick = (chatId) => {
    if (chatId !== currentChat.id) {
      loadChat(chatId);
    }
  };

  return (
    <>
      <div className="h-full flex flex-col bg-gradient-to-b from-[#18181b] via-[#232336] to-[#18181b] text-white relative overflow-hidden shadow-2xl rounded-2xl border border-gray-800/60">
        {/* Subtle background grid */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03) 1px,transparent 1px,transparent 40px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Header */}
        <div className="p-6 border-b border-gray-800/70 relative z-20 bg-gradient-to-r from-[#232336]/80 to-transparent">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 p-3 rounded-2xl shadow-lg border border-indigo-700/30">
                <ChatBubbleLeftIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">AI Assistant</h2>
                <p className="text-xs text-gray-400 font-medium">Kuberox LLM</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800/60 rounded-xl transition-all duration-200 lg:hidden backdrop-blur-sm relative z-30"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={startNewChat}
            className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl relative overflow-hidden group z-30 border border-indigo-700/40"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <PlusIcon className="h-5 w-5 relative z-10" />
            <span className="font-semibold relative z-10">New Chat</span>
          </motion.button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 relative z-20 custom-scrollbar">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Recent Chats
            </h3>
            {chatHistory.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowDeleteAllConfirm(true)}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 relative z-30"
                aria-label="Delete all chats"
              >
                <TrashIcon className="h-4 w-4" />
              </motion.button>
            )}
          </div>

          <AnimatePresence mode="wait" key={chatHistory.length}>
            {chatHistory.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-gray-500 text-sm py-8"
              >
                No chat history yet.<br />
                Start a new conversation!
              </motion.div>
            ) : (
              chatHistory.map((chat, index) => (
                <motion.div
                  key={`${chat.id}-${chatHistory.length}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.8 }}
                  transition={{ delay: index * 0.04 }}
                  className={`group relative p-3 rounded-xl cursor-pointer transition-all ${
                    currentChat.id === chat.id
                      ? 'bg-gradient-to-r from-indigo-700/40 to-blue-700/20 border border-indigo-600/40 shadow-lg'
                      : 'hover:bg-gray-800/60'
                  }`}
                  onClick={() => handleChatClick(chat.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {chat.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {chat.messages.length} messages
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/20 hover:text-red-400 rounded transition-all relative z-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-700 relative z-20">
        <div className="flex items-center space-x-3 mb-3">
          <img
            src={user?.picture}
            alt={user?.name}
            className="w-10 h-10 rounded-full border-2 border-gray-600"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {user?.email}
            </p>
          </div>
        </div>

        <div className="space-y-1 relative z-30">
          {/* <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center space-x-2 p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors cursor-pointer relative z-40"
          >
            <UserIcon className="h-4 w-4" />
            <span>Profile</span>
          </button> */}
          <button
            onClick={() => navigate('/history')}
            className="w-full flex items-center space-x-2 p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors cursor-pointer relative z-40"
          >
            <ClockIcon className="h-4 w-4" />
            <span>Chat History</span>
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center space-x-2 p-2 text-sm text-gray-300 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors relative z-40"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Delete All Confirmation Modal */}
      <AnimatePresence>
        {showDeleteAllConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold text-white mb-2">
                Delete All Chats?
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                This action cannot be undone. All your chat history will be permanently deleted.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="flex-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Logout Confirmation Modal - Outside sidebar container */}
    {showLogoutConfirm && createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Sign Out Confirmation
                </h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to sign out?
                </p>
              </div>
            </div>
            
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body
    )}
  </>
  );
};

export default Sidebar;
