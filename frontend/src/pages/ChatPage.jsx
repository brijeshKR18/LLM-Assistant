import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import ChatContainer from '../components/ChatContainer';
import ChatInput from '../components/ChatInput';
import { useChat } from '../contexts/ChatContext';
import { Bars3Icon } from '@heroicons/react/24/outline';

const ChatPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentChat, isLoading } = useChat();
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentChat.messages]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-80 bg-white border-r border-gray-200 flex-shrink-0"
          >
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-visible">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {!sidebarOpen && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bars3Icon className="h-6 w-6 text-gray-600" />
              </motion.button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {currentChat.title}
              </h1>
              <p className="text-sm text-gray-500">
                {currentChat.messages.length === 0 
                  ? "Start a conversation" 
                  : `${currentChat.messages.length} messages`}
              </p>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4"
        >
          {currentChat.messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-6"
            >
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-2xl">
                <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to AI Assistant
                </h3>
                <p className="text-gray-600 max-w-md">
                  Start a conversation with our AI assistant. Ask questions, get help with tasks, or just chat!
                </p>
              </div>
            </motion.div>
          ) : (
            <ChatContainer messages={currentChat.messages} isLoading={isLoading} />
          )}
        </div>

        {/* Chat Input */}
        <div className="bg-white border-t border-gray-200 p-4 relative overflow-visible">
          <ChatInput />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
