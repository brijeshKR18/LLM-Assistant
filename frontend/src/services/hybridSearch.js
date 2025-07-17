// Web search configuration for the frontend

export const WEB_SEARCH_CONFIG = {
  // Toggle for enabling web search
  enableWebSearch: true,
  
  // Default settings
  defaultSettings: {
    useWebSearch: true,
    trustedSitesOnly: true,
    maxWebResults: 5,
    combineWithLocal: true
  },
  
  // UI labels and descriptions
  labels: {
    webSearchToggle: "Include Red Hat Official Docs",
    trustedSitesOnly: "Official Red Hat Documentation",
    localOnly: "Local Documents Only", 
    hybrid: "Local + Official Red Hat Docs",
    webOnly: "Official Red Hat Docs Only"
  },
  
  descriptions: {
    webSearch: "Access official Red Hat documentation for OpenShift, RHEL, and Ansible",
    trustedSites: "Direct access to docs.redhat.com official documentation",
    hybrid: "Combine your local documents with official Red Hat documentation"
  }
};

// Function to build query request with web search options
export const buildHybridQueryRequest = (query, options = {}) => {
  return {
    query: query.trim(),
    model: options.model || "mistral:instruct",
    use_web_search: options.useWebSearch ?? true,
    trusted_sites_only: options.trustedSitesOnly ?? true,
    chat_id: options.chatId || `chat_${Date.now()}`,
    conversation_history: options.conversationHistory || []
  };
};

// Function to call the hybrid query endpoint
export const performHybridQuery = async (query, options = {}) => {
  const requestBody = buildHybridQueryRequest(query, options);
  
  try {
    const response = await fetch('/api/hybrid-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      data: {
        answer: result.response,
        sources: result.sources || [],
        hasLocalKnowledge: result.has_local_knowledge,
        hasWebKnowledge: result.has_web_knowledge,
        searchType: result.search_type,
        timestamp: result.timestamp
      }
    };
    
  } catch (error) {
    console.error('Hybrid query failed:', error);
    return {
      success: false,
      error: error.message,
      fallbackToLocal: true
    };
  }
};
