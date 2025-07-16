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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-[0.015]">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(99, 102, 241, 0.6) 1px, transparent 0)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>
      
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-80 glass-dark flex-shrink-0 border-r border-white/10 relative z-10"
          >
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 ">
        {/* Enhanced Header */}
        <header className="glass-card border-b border-white/20 px-6 py-4 flex items-center justify-between relative">
          <div className="flex items-center space-x-4">
            {!sidebarOpen && (
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(true)}
                className="p-3 rounded-xl hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
              >
                <Bars3Icon className="h-6 w-6 text-gray-700" />
              </motion.button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {currentChat.title}
              </h1>
              <p className="text-sm text-gray-500 font-medium">
                {currentChat.messages.length === 0 
                  ? "Ready to assist you" 
                  : `${currentChat.messages.length} messages`}
              </p>
            </div>
          </div>
          
        </header>

        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-6 min-w-0 relative "
        >
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent pointer-events-none"></div>
          
          {currentChat.messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-8 relative z-10"
            >
              <div className="relative">
                <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 p-6 rounded-3xl shadow-2xl relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 rounded-3xl blur-xl opacity-50"></div>
                  <svg className="h-16 w-16 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-4 max-w-lg">
                <h3 className="text-2xl font-bold gradient-text">
                  Welcome to AI Assistant
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed font-medium">
                  Ask questions or  get help with tasks!
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="relative z-10">
              <ChatContainer messages={currentChat.messages} isLoading={isLoading} />
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="glass-card border-t border-white/20 p-6 relative">
          <ChatInput />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
