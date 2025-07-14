import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  ArrowLeftIcon, 
  ChatBubbleLeftIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const HistoryPage = () => {
  const { user } = useAuth();
  const { chatHistory, loadChat, deleteChat, deleteAllChats } = useChat();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const filteredHistory = chatHistory.filter(chat =>
    chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.messages.some(msg => 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleChatClick = (chatId) => {
    loadChat(chatId);
    navigate('/chat');
  };

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  const handleDeleteAll = () => {
    deleteAllChats();
    setShowDeleteAllConfirm(false);
  };

  const groupChatsByDate = (chats) => {
    const groups = {};
    chats.forEach(chat => {
      const date = format(new Date(chat.updatedAt), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(chat);
    });
    return groups;
  };

  const groupedChats = groupChatsByDate(filteredHistory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/chat')}
              className="p-2 hover:bg-white/50 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Chat History</h1>
              <p className="text-gray-600">
                {chatHistory.length} conversations • {chatHistory.reduce((sum, chat) => sum + chat.messages.length, 0)} total messages
              </p>
            </div>
          </div>
          
          {chatHistory.length > 0 && (
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Delete All</span>
            </button>
          )}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>
        </motion.div>

        {/* Chat History */}
        <div className="space-y-8">
          {Object.keys(groupedChats).length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-16"
            >
              <div className="bg-white rounded-2xl shadow-lg p-12 max-w-md mx-auto">
                <ClockIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'No matching conversations' : 'No chat history yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm 
                    ? 'Try adjusting your search terms'
                    : 'Start a conversation to see your chat history here'
                  }
                </p>
                <button
                  onClick={() => navigate('/chat')}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
                >
                  <ChatBubbleLeftIcon className="h-5 w-5" />
                  <span>Start New Chat</span>
                </button>
              </div>
            </motion.div>
          ) : (
            Object.entries(groupedChats)
              .sort(([a], [b]) => new Date(b) - new Date(a))
              .map(([date, chats], groupIndex) => (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + groupIndex * 0.05 }}
                >
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {chats
                      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                      .map((chat, index) => (
                        <motion.div
                          key={chat.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 + index * 0.02 }}
                          whileHover={{ scale: 1.02 }}
                          className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-100"
                          onClick={() => handleChatClick(chat.id)}
                        >
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-900 truncate">
                                  {chat.title}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                                </p>
                              </div>
                              <button
                                onClick={(e) => handleDeleteChat(e, chat.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded-full transition-all"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{chat.messages.length} messages</span>
                                <span>{format(new Date(chat.updatedAt), 'HH:mm')}</span>
                              </div>
                              
                              {chat.messages.length > 0 && (
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {chat.messages[chat.messages.length - 1]?.content.substring(0, 100)}
                                  {chat.messages[chat.messages.length - 1]?.content.length > 100 && '...'}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    }
                  </div>
                </motion.div>
              ))
          )}
        </div>
      </div>

      {/* Delete All Confirmation Modal */}
      <AnimatePresence>
        {showDeleteAllConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete All Conversations?
                </h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                This action cannot be undone. All your chat history will be permanently deleted.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HistoryPage;
