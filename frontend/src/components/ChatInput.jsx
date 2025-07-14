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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-white border border-indigo-200 rounded-xl shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
            <span className="text-sm text-indigo-900 font-semibold truncate max-w-xs">
              {uploadedFile.name}
            </span>
          </div>
          <button
            type="button"
            onClick={handleDeleteFile}
            className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
            aria-label="Remove file"
          >
            <XMarkIcon className="h-5 w-5 text-indigo-600" />
          </button>
        </motion.div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-end gap-4 relative overflow-visible">
          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-4 py-3 pr-14 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white shadow-md text-gray-900 placeholder-gray-400 transition-all"
              disabled={isLoading}
              rows={1}
              style={{
                minHeight: '48px',
                maxHeight: '120px',
                resize: 'none'
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* File Upload */}
            {!uploadedFile && (
              <FileUpload onFileUpload={handleFileChange} />
            )}

            {/* Model Selector */}
            <div className="relative z-50">
              <ModelSelector value={selectedModel} onChange={handleModelChange} />
            </div>

            {/* Send/Stop Button */}
            {isLoading ? (
              <motion.button
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={cancelRequest}
                className="p-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-full shadow-lg transition-colors"
                aria-label="Stop"
              >
                <StopIcon className="h-5 w-5" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={!input.trim()}
                className={`p-3 rounded-full shadow-lg transition-all ${
                  input.trim()
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                aria-label="Send"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </motion.button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export default ChatInput;
