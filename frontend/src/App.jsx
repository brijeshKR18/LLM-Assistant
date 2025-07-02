import { useState, useCallback, useRef } from "react";
import { submitQuery } from "./api/ragApi";
import ModelSelector from "./components/ModelSelector";
import QueryInput from "./components/QueryInput";
import FileUploader from "./components/FileUploader";
import AnswerDisplay from "./components/AnswerDisplay";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes typing-cursor {
    0%, 100% { border-right: 2px solid transparent; }
    50% { border-right: 2px solid #E11D48; }
  }
  
  /* Markdown content styles */
  .prose {
    font-size: 1rem;
    line-height: 1.75;
  }
  
  .prose p {
    margin-bottom: 1.25em;
  }
  
  .prose code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }
  
  .prose pre {
    margin: 1em 0;
    border-radius: 0.375rem;
    background-color: #1e293b;
  }
  
  @keyframes bounce-subtle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }
  
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-typing-cursor {
    padding-right: 2px;
    animation: typing-cursor 0.8s steps(2) infinite;
  }
  
  .animate-bounce-subtle {
    animation: bounce-subtle 2s ease-in-out infinite;
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
  }
`;
document.head.appendChild(style);

// Function to detect if text contains code blocks
const containsCodeBlock = (text) => {
  return text.includes('```');
};

// Function to process message content
const processMessageContent = (content) => {
  if (!containsCodeBlock(content)) {
    // If no code blocks, wrap terminal commands in markdown code syntax
    return content.replace(/(\$ .+)/g, '```bash\n$1\n```');
  }
  return content;
};

// Custom code block renderer
const CodeBlock = ({ language, value }) => {
  return (
    <div className="rounded-md overflow-hidden my-2 group relative">
      <div className="bg-gray-800 px-4 py-2 text-xs font-medium text-gray-200 flex justify-between items-center">
        <span>{language || 'bash'}</span>
        <button
          onClick={() => navigator.clipboard.writeText(value)}
          className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs"
        >
          Copy
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'bash'}
        style={coldarkDark}
        customStyle={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

function App() {
  const [query, setQuery] = useState("");
  const [model, setModel] = useState("mistral:instruct");
  const [file, setFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamTimeoutRef = useRef();

  // Utility function to split text into natural chunks
  const splitIntoChunks = (text) => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(sentence => sentence.trim()).filter(Boolean);
  };

  // Function to simulate streaming effect
  const streamResponse = useCallback((chunks) => {
    let currentIndex = 0;
    let accumulatedText = "";
    
    const stream = () => {
      if (currentIndex < chunks.length) {
        accumulatedText += chunks[currentIndex] + " ";
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            type: 'assistant',
            content: accumulatedText.trim()
          };
          return newMessages;
        });
        currentIndex++;
        // Calculate delay based on chunk length for more natural timing
        const delay = Math.min(
          50 + (chunks[currentIndex - 1].length * 10) + (Math.random() * 100),
          300
        );
        streamTimeoutRef.current = setTimeout(stream, delay);
      } else {
        setIsStreaming(false);
      }
    };

    setIsStreaming(true);
    stream();
  }, []);

  // Cleanup function for streaming timeouts
  const cleanup = useCallback(() => {
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
    }
    setIsStreaming(false);
  }, []);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    const userQuery = query;
    setQuery("");
    setLoading(true);
    setMessages(prev => [...prev, { type: 'user', content: userQuery }]);
    
    try {
      const result = await submitQuery(userQuery, model, file);
      let answer = result.answer || "No answer returned.";
      
      // Ensure code blocks are properly formatted
      const chunks = splitIntoChunks(answer);
      
      // Immediately show the first chunk as the initial response
      setMessages(prev => [...prev, { type: 'assistant', content: chunks[0] }]);
      
      // If there are more chunks, start the streaming simulation
      if (chunks.length > 1) {
        streamResponse(chunks.slice(1));
      } else {
        setIsStreaming(false);
      }
    } catch (err) {
      setMessages(prev => [...prev, { type: 'assistant', content: "Error: " + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-[300px] bg-white border-r border-gray-200 p-4 flex flex-col">
        <header className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-lg w-8 h-8 flex items-center justify-center text-white text-lg shadow-sm">
            <span>🦾</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            LLM Assistant
          </h1>
        </header>
        <ModelSelector model={model} setModel={setModel} />
        <div className="mt-4">
          <FileUploader setFile={setFile} />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Messages */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto py-6 px-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-6 ${message.type === 'assistant' ? 'bg-white border border-gray-100' : ''} 
                  animate-fade-in transition-all duration-300`}
              >
                <div className="max-w-3xl mx-auto px-4 py-6 flex gap-4">
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center transform transition-transform duration-300
                    ${message.type === 'assistant' 
                      ? 'bg-gradient-to-r from-red-600 to-red-500 text-white animate-bounce-subtle' 
                      : 'bg-gray-100'
                    }`}
                  >
                    {message.type === 'assistant' ? '🦾' : '👤'}
                  </div>
                  <div className="flex-1">
                    <div className="prose max-w-none">
                      <div className={`text-gray-800 ${
                        message.type === 'assistant' && index === messages.length - 1 && isStreaming
                          ? 'animate-typing-cursor'
                          : ''
                      }`}>
                        <ReactMarkdown
                          components={{
                            code: ({ node, inline, className, children, ...props }) => {
                              const match = /language-(\w+)/.exec(className || '');
                              const language = match ? match[1] : 'bash';
                              
                              if (inline) {
                                return (
                                  <code className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 font-mono text-sm">
                                    {children}
                                  </code>
                                );
                              }
                              
                              return (
                                <CodeBlock
                                  language={language}
                                  value={String(children).replace(/\n$/, '')}
                                />
                              );
                            },
                            p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                          }}
                        >
                          {processMessageContent(message.content)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(loading || isStreaming) && (
              <div className="max-w-3xl mx-auto px-4 py-6 flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-red-600 to-red-500 flex-shrink-0 flex items-center justify-center text-white">
                  🦾
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="h-3 w-3 bg-red-400 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
                      <div className="h-3 w-3 bg-red-400 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                      <div className="h-3 w-3 bg-red-400 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
                    </div>
                    {isStreaming && (
                      <span className="text-sm text-gray-500 animate-fade-in">
                        generating response...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <QueryInput query={query} setQuery={setQuery} />
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg font-medium transition-all duration-200 
                  ${loading 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 cursor-pointer'
                  } text-white`}
              >
                <span className="flex items-center gap-2">
                  {loading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
