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
  const { 
    sendMessage, 
    cancelRequest, 
    isLoading, 
    selectedModel, 
    setSelectedModel, 
    useHybridSearch, 
    setUseHybridSearch
  } = useChat();
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
            whileHover={{ scale: isLoading ? 1 : 1.1, backgroundColor: isLoading ? "transparent" : "rgba(239, 68, 68, 0.1)" }}
            whileTap={{ scale: isLoading ? 1 : 0.9 }}
            type="button"
            onClick={handleDeleteFile}
            disabled={isLoading}
            className={`p-2 rounded-xl transition-all duration-200 ${
              isLoading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-red-50'
            }`}
            aria-label="Remove file"
          >
            <XMarkIcon className={`h-5 w-5 transition-colors duration-200 ${
              isLoading 
                ? 'text-gray-400' 
                : 'text-gray-600 hover:text-red-600'
            }`} />
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
              <div className={`relative z-50 ${isLoading ? 'opacity-100 pointer-events-none' : ''}`}>
                <FileUpload onFileUpload={handleFileChange} disabled={isLoading} />
              </div>
            )}

            {/* Model Selector */}
            <div className={`relative z-50 ${isLoading ? 'opacity-100 pointer-events-none' : ''}`}>
              <ModelSelector 
                value={selectedModel} 
                onChange={handleModelChange}
                disabled={isLoading}
              />
            </div>

            {/* Hybrid Search Toggle */}
            <div className={`relative z-50 ${isLoading ? 'opacity-100 pointer-events-none' : ''}`}>
              <motion.button
                whileHover={{ scale: isLoading ? 1 : 1.05, y: isLoading ? 0 : -1 }}
                whileTap={{ scale: isLoading ? 1 : 0.95 }}
                onClick={() => setUseHybridSearch(!useHybridSearch)}
                disabled={isLoading}
                className={`p-4 glass-card border border-white/30 rounded-2xl shadow-lg transition-all duration-200 group relative overflow-hidden ${
                  isLoading
                    ? 'cursor-not-allowed' 
                    : 'hover:border-violet-300 hover:shadow-xl cursor-pointer'
                }`}
                title={isLoading ? 'Search mode locked during generation' : 
                  useHybridSearch ? 'Switch to Local Only' : 'Switch to Hybrid Search (Local + Red Hat Docs)'}
              >
                {/* Hover effect overlay */}
                {!isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                )}
                
                {/* Content */}
                <div className="relative z-10 flex items-center space-x-2">
                  <div className={`h-3 w-3 rounded-full transition-all duration-200 ${
                    useHybridSearch 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-sm' 
                      : 'bg-gray-400'
                  }`} />
                  <span className={`font-medium text-xs transition-colors duration-200 ${
                    isLoading
                      ? 'text-gray-400'
                      : useHybridSearch 
                        ? 'text-emerald-600 group-hover:text-violet-700' 
                        : 'text-gray-600 group-hover:text-violet-700'
                  }`}>
                    {useHybridSearch ? 'Web' : 'Local'}
                  </span>
                </div>
              </motion.button>
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
                disabled={!input.trim() || isLoading}
                className={`p-4 rounded-2xl shadow-lg transition-all duration-200 relative overflow-hidden group ${
                  input.trim() && !isLoading
                    ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 hover:from-violet-700 hover:via-purple-700 hover:to-blue-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                aria-label="Send message"
              >
                {input.trim() && !isLoading && (
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
