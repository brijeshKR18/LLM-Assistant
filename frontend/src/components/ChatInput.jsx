import { useState } from 'react';
import { motion } from 'framer-motion';
import { useChat } from '../contexts/ChatContext';
import FileUpload from './FileUpload';
import ModelSelector from './ModelSelector';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  PaperAirplaneIcon, 
  StopIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

function ChatInput() {
  const { sendMessage, cancelRequest, isLoading, selectedModel, setSelectedModel } = useChat();
  const [input, setInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);

  // Submit query and file reference
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    sendMessage(input, selectedModel, uploadedFileName);
    setInput('');
  };

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
  };

  const handleFileChange = async (file) => {
    setUploadedFile(file);
    // Upload file to backend and get filename
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadToast = toast.loading('Uploading file...');
    
    try {
      const response = await axios.post('http://localhost:8000/upload', formData);
      setUploadedFileName(response.data.filename);
      toast.success('File uploaded successfully!', { id: uploadToast });
    } catch (error) {
      setUploadedFile(null);
      setUploadedFileName(null);
      toast.error('Error uploading file', { id: uploadToast });
    }
  };

  // Remove file
  const handleDeleteFile = () => {
    setUploadedFile(null);
    setUploadedFileName(null);
    toast.success('File removed');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Uploaded File Display */}
      {uploadedFile && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="flex items-center justify-between p-4 glass-card border border-white/30 rounded-2xl backdrop-blur-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full shadow-sm"></div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-900 font-semibold truncate max-w-xs">
                {uploadedFile.name}
              </span>
              <span className="text-xs text-gray-500 font-medium">File attached</span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={handleDeleteFile}
            className="p-2 hover:bg-red-50 rounded-xl transition-all duration-200"
            aria-label="Remove file"
          >
            <XMarkIcon className="h-5 w-5 text-gray-600 hover:text-red-600" />
          </motion.button>
        </motion.div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-end gap-4 relative overflow-visible">
          {/* Text Input */}
          <div className="flex-1 relative">
            <div className="relative glass-card border border-white/30 rounded-3xl shadow-lg overflow-hidden backdrop-blur-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="w-full px-6 py-4 pr-16 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-gray-900 placeholder-gray-500 font-medium"
                disabled={isLoading}
                rows={1}
                style={{
                  minHeight: '56px',
                  maxHeight: '140px',
                  resize: 'none'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
                }}
              />
              
              {/* Input enhancement overlay */}
              <div className="absolute inset-0 opacity-[0.015] pointer-events-none">
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

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* File Upload */}
            {!uploadedFile && (
              <div className="relative z-50">
                <FileUpload onFileUpload={handleFileChange} />
              </div>
            )}

            {/* Model Selector */}
            <div className="relative z-50">
              <ModelSelector 
                value={selectedModel} 
                onChange={handleModelChange} 
              />
            </div>

            {/* Send/Stop Button */}
            {isLoading ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={cancelRequest}
                className="p-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl shadow-lg transition-all duration-200 relative overflow-hidden group"
                aria-label="Stop generation"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <StopIcon className="h-6 w-6 relative z-10" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!input.trim()}
                className={`p-4 rounded-2xl shadow-lg transition-all duration-200 relative overflow-hidden group ${
                  input.trim()
                    ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 hover:from-violet-700 hover:via-purple-700 hover:to-blue-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                aria-label="Send message"
              >
                {input.trim() && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                )}
                <PaperAirplaneIcon className="h-6 w-6 relative z-10" />
              </motion.button>
            )}
          </div>
        </div>
        
        {/* Input hints */}
        <div className="flex items-center justify-between mt-3 px-2">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center space-x-1">
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-medium">Enter</kbd>
              <span>to send</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-medium">Shift + Enter</kbd>
              <span>for new line</span>
            </span>
          </div>
          <div className="text-xs text-gray-400 font-medium">
            {input.length > 0 && `${input.length} characters`}
          </div>
        </div>
      </form>
    </div>
  );
}

export default ChatInput;
