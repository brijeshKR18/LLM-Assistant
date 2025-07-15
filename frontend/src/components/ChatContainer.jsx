import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import Message from './Message';

const ChatContainer = forwardRef(({ messages, isLoading }, ref) => {
  return (
    <div
      ref={ref}
      className="space-y-6 w-full min-w-0"
    >
      {messages.map((msg, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className={`flex w-full min-w-0 ${
            msg.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[85%] lg:max-w-[70%] min-w-0 break-words ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md'
                : msg.error
                  ? 'bg-red-50 border border-red-200 text-red-800 rounded-2xl rounded-bl-md'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-md shadow-sm'
            } px-4 py-3`}
          >
            <Message message={msg} />
            {msg.timestamp && (
              <div className={`text-xs mt-2 ${
                msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
              }`}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        </motion.div>
      ))}
      
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start"
        >
          <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-sm px-4 py-3">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-gray-500 text-sm">AI is thinking...</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
});

ChatContainer.displayName = 'ChatContainer';

export default ChatContainer;