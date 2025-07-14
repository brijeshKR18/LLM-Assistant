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
    <div className="space-y-3 overflow-hidden">
      {/* Uploaded File Display */}
      {uploadedFile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
            <span className="text-sm text-indigo-800 font-medium">
              {uploadedFile.name}
            </span>
          </div>
          <button
            type="button"
            onClick={handleDeleteFile}
            className="p-1 hover:bg-indigo-200 rounded-full transition-colors"
          >
            <XMarkIcon className="h-4 w-4 text-indigo-600" />
          </button>
        </motion.div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative overflow-hidden">
        <div className="flex items-end space-x-3 overflow-hidden">
          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white shadow-sm"
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
          <div className="flex items-center space-x-2 flex-shrink-0 overflow-visible">
            {/* File Upload */}
            {!uploadedFile && (
              <FileUpload onFileUpload={handleFileChange} />
            )}

            {/* Model Selector */}
            <div className="relative overflow-visible">
              <ModelSelector value={selectedModel} onChange={handleModelChange} />
            </div>

            {/* Send/Stop Button */}
            {isLoading ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={cancelRequest}
                className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-colors"
              >
                <StopIcon className="h-5 w-5" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!input.trim()}
                className={`p-3 rounded-full shadow-lg transition-all ${
                  input.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
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
