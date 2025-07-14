import { useState } from 'react';
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

  const handleChatClick = (chatId) => {
    if (chatId !== currentChat.id) {
      loadChat(chatId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-lg">
              <ChatBubbleLeftIcon className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold">AI Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors lg:hidden"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={startNewChat}
          className="w-full flex items-center space-x-2 p-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>New Chat</span>
        </motion.button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Recent Chats
          </h3>
          {chatHistory.length > 0 && (
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {chatHistory.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-400 text-sm py-8"
            >
              No chat history yet.<br />
              Start a new conversation!
            </motion.div>
          ) : (
            chatHistory.map((chat, index) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                  currentChat.id === chat.id
                    ? 'bg-indigo-600/20 border border-indigo-600/30'
                    : 'hover:bg-gray-700/50'
                }`}
                onClick={() => handleChatClick(chat.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/20 hover:text-red-400 rounded transition-all"
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
      <div className="p-4 border-t border-gray-700">
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

        <div className="space-y-1">
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center space-x-2 p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <UserIcon className="h-4 w-4" />
            <span>Profile</span>
          </button>
          <button
            onClick={() => navigate('/history')}
            className="w-full flex items-center space-x-2 p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ClockIcon className="h-4 w-4" />
            <span>Chat History</span>
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center space-x-2 p-2 text-sm text-gray-300 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors"
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

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center p-4 z-50"
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
              
              <p className="text-gray-700 mb-6">
                You'll be able to sign in again with any Google account you choose.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sidebar;
