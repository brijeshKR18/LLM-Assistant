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
  const [useHybridSearch, setUseHybridSearch] = useState(true); // Enable hybrid search by default
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

  const saveCurrentChat = (forceUpdate = false) => {
    if (!user || currentChat.messages.length === 0) return;

    // Check if the current chat was already deleted
    const chatStillExists = chatHistory.some(chat => chat.id === currentChat.id);
    if (!chatStillExists && currentChat.messages.length > 0) {
      // This is a new chat, so we can save it
    } else if (!chatStillExists) {
      // This chat was deleted, don't save it
      return;
    }

    const existingChat = chatHistory.find(chat => chat.id === currentChat.id);
    
    // Only update timestamp if:
    // 1. It's a forced update (new message added)
    // 2. It's a new chat (not in history yet)
    // 3. The message count has changed (new messages added)
    const shouldUpdateTimestamp = forceUpdate || 
                                 !existingChat || 
                                 (existingChat && existingChat.messages.length !== currentChat.messages.length);

    const updatedChat = {
      ...currentChat,
      updatedAt: shouldUpdateTimestamp ? new Date().toISOString() : currentChat.updatedAt,
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
    // Save current chat if it has messages (but don't update timestamp just for switching)
    if (currentChat.messages.length > 0) {
      saveCurrentChat(false);
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
    // Save current chat first (only if it has messages and is different from the one we're loading)
    // Don't update timestamp when just switching between chats
    if (currentChat.messages.length > 0 && currentChat.id !== chatId) {
      saveCurrentChat(false);
    }

    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setCurrentChat(chat);
    }
  };

  const deleteChat = (chatId) => {
    const isCurrentChat = currentChat.id === chatId;
    
    const newHistory = chatHistory.filter(chat => chat.id !== chatId);
    
    // Update both state and localStorage
    setChatHistory(newHistory);
    saveChatHistory(newHistory);
    
    // Clean up backend session
    axios.delete(`http://localhost:8000/sessions/${chatId}`)
      .then(() => {
        console.log(`Backend session ${chatId} cleaned up successfully`);
      })
      .catch((error) => {
        console.warn(`Failed to clean up backend session ${chatId}:`, error);
      });
    
    // If we're deleting the current chat, start a new one immediately
    if (isCurrentChat) {
      startNewChat();
      toast.success('Current chat deleted - started new chat');
    } else {
      toast.success('Chat deleted successfully');
    }
  };

  const deleteAllChats = () => {
    const chatIds = chatHistory.map(chat => chat.id);
    
    setChatHistory([]);
    saveChatHistory([]);
    
    // Clean up all backend sessions
    axios.delete('http://localhost:8000/sessions')
      .then(() => {
        console.log('All backend sessions cleaned up successfully');
      })
      .catch((error) => {
        console.warn('Failed to clean up backend sessions:', error);
      });
    
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
      const payload = { 
        query, 
        model,
        chat_id: currentChat.id,  // Send chat ID for session isolation
        conversation_history: updatedMessages,  // Send conversation history
        use_web_search: useHybridSearch,  // Enable/disable web search
        trusted_sites_only: true  // Use only trusted Red Hat sites
      };
      if (filename) {
        payload.filename = filename;
      }
      
      // Use hybrid-query endpoint for better results
      const endpoint = useHybridSearch ? 'http://localhost:8000/hybrid-query' : 'http://localhost:8000/query';
      const response = await axios.post(endpoint, payload, {
        signal: abortControllersRef.current.signal,
      });
      
      const assistantMessage = {
        role: 'assistant',
        content: response.data.response || response.data.answer, // hybrid-query uses 'response', query uses 'answer'
        sources: response.data.sources || [],
        searchType: response.data.search_type || 'local',
        hasLocalKnowledge: response.data.has_local_knowledge,
        hasWebKnowledge: response.data.has_web_knowledge,
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

  // Auto-save current chat when messages change (but only for new messages, not when switching chats)
  useEffect(() => {
    if (currentChat.messages.length > 0) {
      // Check if this chat exists in history and if message count increased
      const existingChat = chatHistory.find(chat => chat.id === currentChat.id);
      const hasNewMessages = !existingChat || (existingChat.messages.length < currentChat.messages.length);
      
      if (hasNewMessages) {
        const timeoutId = setTimeout(() => {
          saveCurrentChat(true); // Force update timestamp for new messages
        }, 1000); // Auto-save after 1 second of inactivity
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [currentChat.messages, currentChat.id]);

  const value = {
    currentChat,
    chatHistory,
    isLoading,
    selectedModel,
    setSelectedModel,
    useHybridSearch,
    setUseHybridSearch,
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
