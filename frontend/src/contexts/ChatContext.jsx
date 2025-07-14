import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import toast from 'react-hot-toast';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentChat, setCurrentChat] = useState({
    id: uuidv4(),
    messages: [],
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('mistral:instruct');
  const abortControllersRef = useRef(null);

  // Load chat history when user changes
  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  const loadChatHistory = () => {
    if (!user) return;
    
    const history = localStorage.getItem(`chatHistory_${user.id}`);
    if (history) {
      setChatHistory(JSON.parse(history));
    }
  };

  const saveChatHistory = (history) => {
    if (!user) return;
    
    localStorage.setItem(`chatHistory_${user.id}`, JSON.stringify(history));
    setChatHistory(history);
  };

  const saveCurrentChat = () => {
    if (!user || currentChat.messages.length === 0) return;

    const updatedChat = {
      ...currentChat,
      updatedAt: new Date().toISOString(),
      title: generateChatTitle(currentChat.messages[0]?.content || 'New Chat'),
    };

    setCurrentChat(updatedChat);

    const existingChatIndex = chatHistory.findIndex(chat => chat.id === updatedChat.id);
    let newHistory;
    
    if (existingChatIndex >= 0) {
      newHistory = [...chatHistory];
      newHistory[existingChatIndex] = updatedChat;
    } else {
      newHistory = [updatedChat, ...chatHistory];
    }

    saveChatHistory(newHistory);
  };

  const generateChatTitle = (firstMessage) => {
    if (!firstMessage) return 'New Chat';
    
    // Take first 50 characters and add ellipsis if longer
    const title = firstMessage.length > 50 
      ? firstMessage.substring(0, 50) + '...'
      : firstMessage;
    
    return title;
  };

  const startNewChat = () => {
    // Save current chat if it has messages
    if (currentChat.messages.length > 0) {
      saveCurrentChat();
    }

    // Start new chat
    const newChat = {
      id: uuidv4(),
      messages: [],
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setCurrentChat(newChat);
  };

  const loadChat = (chatId) => {
    // Save current chat first
    if (currentChat.messages.length > 0) {
      saveCurrentChat();
    }

    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setCurrentChat(chat);
    }
  };

  const deleteChat = (chatId) => {
    const newHistory = chatHistory.filter(chat => chat.id !== chatId);
    saveChatHistory(newHistory);
    
    // If we're deleting the current chat, start a new one
    if (currentChat.id === chatId) {
      startNewChat();
    }
    
    toast.success('Chat deleted successfully');
  };

  const deleteAllChats = () => {
    saveChatHistory([]);
    startNewChat();
    toast.success('All chats deleted successfully');
  };

  const sendMessage = async (query, model, filename) => {
    if (!query.trim()) return;

    const userMessage = { 
      role: 'user', 
      content: query,
      timestamp: new Date().toISOString(),
    };
    
    const updatedMessages = [...currentChat.messages, userMessage];
    setCurrentChat(prev => ({
      ...prev,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    }));
    
    setIsLoading(true);
    abortControllersRef.current = new AbortController();

    try {
      const payload = { query, model };
      if (filename) {
        payload.filename = filename;
      }
      
      const response = await axios.post('http://localhost:8000/query', payload, {
        signal: abortControllersRef.current.signal,
      });
      
      const assistantMessage = {
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources || [],
        timestamp: new Date().toISOString(),
      };
      
      setCurrentChat(prev => ({
        ...prev,
        messages: [...updatedMessages, assistantMessage],
        updatedAt: new Date().toISOString(),
      }));
      
    } catch (error) {
      let errorMessage;
      
      if (axios.isCancel(error)) {
        errorMessage = {
          role: 'system',
          content: 'Request cancelled.',
          error: true,
          timestamp: new Date().toISOString(),
        };
      } else {
        errorMessage = {
          role: 'assistant',
          content: error.response?.data?.detail || 'Error: Could not fetch response from server.',
          error: true,
          timestamp: new Date().toISOString(),
        };
      }
      
      setCurrentChat(prev => ({
        ...prev,
        messages: [...updatedMessages, errorMessage],
        updatedAt: new Date().toISOString(),
      }));
      
      toast.error('Failed to get response');
    } finally {
      setIsLoading(false);
      abortControllersRef.current = null;
    }
  };

  const cancelRequest = () => {
    if (abortControllersRef.current) {
      abortControllersRef.current.abort();
      setIsLoading(false);
      toast.info('Request cancelled');
    }
  };

  // Auto-save current chat when messages change
  useEffect(() => {
    if (currentChat.messages.length > 0) {
      const timeoutId = setTimeout(() => {
        saveCurrentChat();
      }, 1000); // Auto-save after 1 second of inactivity
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentChat.messages]);

  const value = {
    currentChat,
    chatHistory,
    isLoading,
    selectedModel,
    setSelectedModel,
    sendMessage,
    cancelRequest,
    startNewChat,
    loadChat,
    deleteChat,
    deleteAllChats,
    saveCurrentChat,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
