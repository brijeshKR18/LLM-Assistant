import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import Message from './Message';

const ChatContainer = forwardRef(({ messages, isLoading }, ref) => {
  return (
    <div
      ref={ref}
      className="space-y-8 w-full min-w-0"
    >
      {messages.map((msg, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
          className={`flex w-full min-w-0 ${
            msg.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div className={`flex items-start space-x-3 max-w-[85%] lg:max-w-[75%] min-w-0 ${
            msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
          }`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg' 
                : 'bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300'
            }`}>
              {msg.role === 'user' ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              )}
            </div>
            
            {/* Message bubble */}
            <div
              className={`min-w-0 break-words relative ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg'
                  : msg.error
                    ? 'bg-gradient-to-br from-red-50 to-red-100 border border-red-200 text-red-800 shadow-sm'
                    : 'glass-card text-gray-800 shadow-sm border border-white/30'
              } px-6 py-4 rounded-3xl ${
                msg.role === 'user' ? 'rounded-br-lg' : 'rounded-bl-lg'
              }`}
            >
              {/* Message content */}
              <div className="relative z-10">
                <Message message={msg} />
              </div>
              
              {/* Timestamp */}
              {msg.timestamp && (
                <div className={`text-xs mt-3 font-medium ${
                  msg.role === 'user' ? 'text-white/70' : 'text-gray-500'
                }`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              )}
              
              {/* Subtle background pattern for AI messages */}
              {msg.role !== 'user' && !msg.error && (
                <div className="absolute inset-0 opacity-[0.02] rounded-3xl rounded-bl-lg overflow-hidden">
                  <div 
                    className="absolute inset-0" 
                    style={{
                      backgroundImage: `radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.8) 1px, transparent 0)`,
                      backgroundSize: '20px 20px'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
      
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex justify-start"
        >
          <div className="flex items-start space-x-3">
            {/* AI Avatar */}
            <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            
            {/* Loading message */}
            <div className="glass-card border border-white/30 shadow-sm px-6 py-4 rounded-3xl rounded-bl-lg">
              <div className="flex items-center space-x-3">
                <div className="loading-dots text-gray-600">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
                <span className="text-gray-600 text-sm font-medium">AI is thinking...</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
});

ChatContainer.displayName = 'ChatContainer';

export default ChatContainer;