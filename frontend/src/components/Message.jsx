import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CircleAlert, Copy, Check } from 'lucide-react';
import { useState } from 'react';

function Message({ message }) {
  const [copiedStates, setCopiedStates] = useState({});

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [index]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [index]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Enhanced formatting for step-by-step content
  const formatStepByStepContent = (content) => {
    // Check if content contains step patterns
    const stepPatterns = [
      /^\d+\.\s/gm,  // "1. Step text"
      /^Step \d+:/gm, // "Step 1: Do something"
      /^•\s/gm,      // "• Bullet point"
    ];
    
    const hasSteps = stepPatterns.some(pattern => pattern.test(content));
    
    // Function to render text with bold formatting
    const renderTextWithBold = (text) => {
      // Handle **bold** and __bold__ markdown syntax
      const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
      
      return parts.map((part, idx) => {
        if (part.match(/^\*\*(.+)\*\*$/)) {
          const boldText = part.replace(/^\*\*|\*\*$/g, '');
          return (
            <strong key={idx}>
              {boldText}
            </strong>
          );
        } else if (part.match(/^__(.+)__$/)) {
          const boldText = part.replace(/^__|\__$/g, '');
          return (
            <strong key={idx}>
              {boldText}
            </strong>
          );
        }
        return part;
      });
    };
    
    if (hasSteps) {
      return content.split('\n').map((line, index) => {
        // Check for numbered steps
        const numberedMatch = line.match(/^(\d+)\.\s(.+)/);
        if (numberedMatch) {
          return (
            <div key={index} className="flex items-start mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-sm font-bold rounded-full flex items-center justify-center mr-3">
                {numberedMatch[1]}
              </span>
              <span className="text-gray-800 font-medium">{renderTextWithBold(numberedMatch[2])}</span>
            </div>
          );
        }
        
        // Check for "Step X:" format
        const stepMatch = line.match(/^Step (\d+):\s*(.+)/);
        if (stepMatch) {
          return (
            <div key={index} className="flex items-start mb-4 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
              <span className="flex-shrink-0 px-2 py-1 bg-green-500 text-white text-sm font-bold rounded mr-3">
                Step {stepMatch[1]}
              </span>
              <span className="text-gray-800 font-medium">{renderTextWithBold(stepMatch[2])}</span>
            </div>
          );
        }
        
        // Check for bullet points
        const bulletMatch = line.match(/^•\s(.+)/);
        if (bulletMatch) {
          return (
            <div key={index} className="flex items-start mb-2 pl-4">
              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></span>
              <span className="text-gray-800 font-medium">{renderTextWithBold(bulletMatch[1])}</span>
            </div>
          );
        }
        
        // Regular line
        if (line.trim()) {
          return (
            <p key={index} className="mb-2 text-gray-800 font-medium">
              {renderTextWithBold(line)}
            </p>
          );
        }
        
        return null;
      }).filter(Boolean);
    }
    
    return null;
  };

  if (message.role === 'system') {
    return (
      <div className="text-center text-gray-500 font-medium">
        {message.content}
      </div>
    );
  }

  if (message.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-800 px-6 py-4 shadow-sm flex items-center gap-3">
        <div className="p-2 bg-red-100 rounded-xl">
          <CircleAlert className="w-5 h-5 text-red-600" />
        </div>
        <span className="font-semibold">{message.content}</span>
      </div>
    );
  }

  // Split message content into markdown/code blocks and plain text
  const content = String(message.content);
  const parts = [];
  
  // Enhanced regex to catch more code block patterns
  const codeBlockRegex = /```(?:([a-zA-Z0-9_+-]+)\s*)?\n?([\s\S]*?)\n?```/g;
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    
    // Extract language and code content
    const language = match[1] || '';
    let codeContent = match[2] || '';
    
    // Clean up code content
    codeContent = codeContent.trim();
    
    parts.push({ 
      type: 'code', 
      value: codeContent,
      language: language
    });
    lastIndex = codeBlockRegex.lastIndex;
  }
  
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push({ type: 'text', value: remainingText });
    }
  }
  
  // Only use proper markdown code blocks - disable auto-detection that causes false positives
  if (parts.length === 0) {
    parts.push({ type: 'text', value: content });
  }

  return (
    <div className={`min-w-0 overflow-hidden ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
      {message.role === 'assistant' && !message.error ? (
        <>
          {/* Copy entire message button */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => copyToClipboard(message.content, 'full-message')}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer text-xs text-gray-600 hover:text-gray-800 border border-gray-200"
              title="Copy entire message"
            >
              {copiedStates['full-message'] ? (
                <>
                  <Check className="w-3 h-3 text-green-600" />
                  <span className="text-green-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Message</span>
                </>
              )}
            </button>
          </div>
          
          <div>
            {parts.map((part, idx) =>
              part.type === 'code' ? (
                <div
                  key={idx}
                  className="bg-gradient-to-r from-gray-800 to-gray-900 text-gray-100 rounded-2xl p-6 my-4 overflow-hidden border border-gray-700 shadow-lg font-mono text-sm relative"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {part.language ? `${part.language} Code` : 'Code'}
                    </span>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => copyToClipboard(part.value, `code-${idx}`)}
                        className="flex items-center space-x-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors cursor-pointer text-xs"
                        title="Copy code"
                      >
                        {copiedStates[`code-${idx}`] ? (
                          <>
                            <Check className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-gray-300" />
                            <span className="text-gray-300">Copy</span>
                          </>
                        )}
                      </button>
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <SyntaxHighlighter
                      language={part.language || 'text'}
                      style={vscDarkPlus}
                      customStyle={{
                        background: 'transparent',
                        margin: 0,
                        padding: 0,
                        fontSize: '0.875rem',
                        lineHeight: '1.5'
                      }}
                      wrapLines={true}
                      wrapLongLines={true}
                    >
                      {part.value}
                    </SyntaxHighlighter>
                  </div>
                </div>
              ) : (
                <div key={idx} className="prose prose-gray dark:prose-invert max-w-none leading-relaxed break-words overflow-wrap-anywhere">
                  {(() => {
                    // Try special step-by-step formatting first
                    const stepFormatted = formatStepByStepContent(part.value);
                    if (stepFormatted) {
                      return <div className="space-y-2">{stepFormatted}</div>;
                    }
                    
                    // Pre-process text to better detect code patterns
                    // Only apply minimal preprocessing to avoid false positives
                    const preprocessText = (text) => {
                      // Only process very specific patterns that are clearly code
                      let processedText = text;
                      
                      // Only shell commands that clearly start with $ or # followed by space
                      processedText = processedText.replace(/^(\$|#)\s+(.+)$/gm, '```bash\n$1 $2\n```');
                      
                      return processedText;
                    };
                    
                    // Apply preprocessing
                    const processedValue = preprocessText(part.value);
                    
                    // Fall back to ReactMarkdown for regular content
                    return (
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => (
                            <p 
                              {...props} 
                              className="mb-4 break-words leading-relaxed text-gray-800 font-medium text-base" 
                            />
                          ),
                      ol: ({ node, ...props }) => (
                        <ol 
                          {...props} 
                          className="list-none space-y-3 ml-0 text-gray-800 font-medium mb-6" 
                        />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul 
                          {...props} 
                          className="space-y-2 ml-0 text-gray-800 font-medium mb-6" 
                        />
                      ),
                      li: ({ node, ...props }) => {
                        const parent = node?.parent;
                        const isOrderedList = parent?.tagName === 'ol';
                        
                        if (isOrderedList) {
                          // Get the index of this li element
                          const index = Array.from(parent.children).indexOf(node) + 1;
                          
                          return (
                            <li 
                              {...props} 
                              className="break-words leading-relaxed text-gray-800 font-medium mb-3 pl-8 relative"
                            >
                              <span 
                                className="absolute left-0 top-0 w-6 h-6 bg-blue-500 text-white text-sm font-bold rounded-full flex items-center justify-center"
                              >
                                {index}
                              </span>
                              <div className="ml-0">
                                {props.children}
                              </div>
                            </li>
                          );
                        } else {
                          return (
                            <li 
                              {...props} 
                              className="break-words leading-relaxed text-gray-800 font-medium mb-2 pl-6 relative"
                            >
                              <span className="absolute left-0 top-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                              <div className="ml-0">
                                {props.children}
                              </div>
                            </li>
                          );
                        }
                      },
                      code: ({ node, ...props }) => (
                        <code 
                          {...props} 
                          className="bg-violet-100 text-violet-800 px-2 py-1 rounded-lg text-sm font-mono font-semibold break-all" 
                        />
                      ),
                      pre: ({ node, children, ...props }) => {
                        // Extract code content and language
                        const codeElement = children && children.props ? children : null;
                        const textContent = codeElement?.props?.children || String(children);
                        const language = codeElement?.props?.className?.replace('language-', '') || 'text';
                        const preIndex = `pre-${idx}-${Math.random()}`;
                        
                        return (
                          <div className="relative group my-4">
                            <div className="bg-gray-800 rounded-lg overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-gray-700">
                                <span className="text-xs font-semibold text-gray-300 uppercase">
                                  {language !== 'text' ? language : 'Code'}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(textContent, preIndex)}
                                  className="flex items-center space-x-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-all cursor-pointer"
                                  title="Copy code"
                                >
                                  {copiedStates[preIndex] ? (
                                    <>
                                      <Check className="w-3 h-3 text-green-400" />
                                      <span className="text-green-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-gray-300" />
                                      <span className="text-gray-300">Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="p-4">
                                <SyntaxHighlighter
                                  language={language !== 'text' ? language : 'bash'}
                                  style={vscDarkPlus}
                                  customStyle={{
                                    background: 'transparent',
                                    margin: 0,
                                    padding: 0,
                                    fontSize: '0.875rem'
                                  }}
                                  wrapLines={true}
                                  wrapLongLines={true}
                                >
                                  {textContent}
                                </SyntaxHighlighter>
                              </div>
                            </div>
                          </div>
                        );
                      },
                      h1: ({ node, ...props }) => (
                        <h1 
                          {...props} 
                          className="text-2xl font-bold text-gray-900 mb-6 mt-8 pb-2 border-b-2 border-blue-200" 
                        />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 
                          {...props} 
                          className="text-xl font-bold text-gray-900 mb-4 mt-6 flex items-center" 
                        >
                          <span className="w-1 h-6 bg-blue-500 mr-3 rounded"></span>
                          {props.children}
                        </h2>
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 
                          {...props} 
                          className="text-lg font-bold text-blue-700 mb-3 mt-5" 
                        />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4 
                          {...props} 
                          className="text-base font-bold text-gray-800 mb-2 mt-4" 
                        />
                      ),
                      h5: ({ node, ...props }) => (
                        <h5 
                          {...props} 
                          className="text-sm font-bold text-gray-700 mb-2 mt-3 uppercase tracking-wide" 
                        />
                      ),
                      h6: ({ node, ...props }) => (
                        <h6 
                          {...props} 
                          className="text-sm font-semibold text-gray-600 mb-2 mt-3" 
                        />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote 
                          {...props} 
                          className="border-l-4 border-blue-500 bg-blue-50 pl-6 py-4 my-6 italic text-gray-700 font-medium rounded-r-lg" 
                        >
                          <div className="flex items-start">
                            <span className="text-blue-500 text-2xl mr-3 mt-1">"</span>
                            <div>{props.children}</div>
                          </div>
                        </blockquote>
                      ),
                      strong: ({ node, ...props }) => (
                        <strong 
                          {...props} 
                        />
                      ),
                      b: ({ node, ...props }) => (
                        <strong 
                          {...props} 
                        />
                      ),
                      em: ({ node, ...props }) => (
                        <em 
                          {...props} 
                          className="italic text-blue-700 font-medium bg-blue-25 px-1 rounded" 
                        />
                      ),
                      hr: ({ node, ...props }) => (
                        <hr 
                          {...props} 
                          className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" 
                        />
                      ),
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-6">
                          <table 
                            {...props} 
                            className="min-w-full border border-gray-200 rounded-lg overflow-hidden" 
                          />
                        </div>
                      ),
                      thead: ({ node, ...props }) => (
                        <thead 
                          {...props} 
                          className="bg-gray-50" 
                        />
                      ),
                      th: ({ node, ...props }) => (
                        <th 
                          {...props} 
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider border-b border-gray-200" 
                        />
                      ),
                      td: ({ node, ...props }) => (
                        <td 
                          {...props} 
                          className="px-4 py-3 text-sm text-gray-800 border-b border-gray-100" 
                        />
                      ),
                    }}
                  >
                    {processedValue}
                  </ReactMarkdown>
                    );
                  })()}
                </div>
              )
            )}
          </div>
          {message.sources && message.sources.length > 0 && (
            <div className="mt-4 p-3 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                <span className="text-xs font-bold text-violet-700 uppercase tracking-wider">Sources</span>
              </div>
              <div className="text-sm text-violet-800 font-medium space-y-2">
                {/* Categorize sources */}
                {(() => {
                  const localSources = message.sources.filter(src => 
                    src.type === 'local' || src.filename || src.source || (src.resource && !src.resource.startsWith('http'))
                  );
                  const webSources = message.sources.filter(src => 
                    src.type === 'web' || (src.resource && src.resource.startsWith('http'))
                  );
                  
                  return (
                    <>
                      {/* Local Document Sources */}
                      {localSources.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-1 mb-1">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Local Documents</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {localSources.map((src, index) => {
                              // Extract filename from any path format
                              let displayName = src.filename || src.source || src.resource || 'Unknown';
                              
                              // If it still contains path separators, extract just the filename
                              if (displayName.includes('/') || displayName.includes('\\')) {
                                displayName = displayName.split('/').pop().split('\\').pop();
                              }
                              
                              return (
                                <span key={`local-${index}`} className="inline-block bg-blue-50 text-blue-800 px-2 py-1 rounded-lg border border-blue-200 text-xs">
                                  {displayName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Web Sources */}
                      {webSources.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-1 mb-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Red Hat Documentation</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {webSources.map((src, index) => (
                              <a 
                                key={`web-${index}`} 
                                href={src.resource} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-block bg-green-50 text-green-800 px-2 py-1 rounded-lg border border-green-200 text-xs hover:bg-green-100 transition-colors duration-200"
                              >
                                {src.title || src.doc_type || new URL(src.resource).hostname}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Copy entire message button for user messages */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => copyToClipboard(message.content, 'user-full-message')}
              className="flex items-center space-x-1 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-xs text-white/80 hover:text-white border border-white/20"
              title="Copy entire message"
            >
              {copiedStates['user-full-message'] ? (
                <>
                  <Check className="w-3 h-3 text-green-300" />
                  <span className="text-green-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Message</span>
                </>
              )}
            </button>
          </div>
          
          <div className="leading-relaxed break-words overflow-wrap-anywhere">
          <ReactMarkdown
            components={{
              p: ({ node, ...props }) => (
                <p 
                  {...props} 
                  className="break-words leading-relaxed text-white font-medium" 
                />
              ),
              ol: ({ node, ...props }) => (
                <ol 
                  {...props} 
                  className="list-decimal list-inside space-y-1 ml-4 text-white font-medium" 
                />
              ),
              ul: ({ node, ...props }) => (
                <ul 
                  {...props} 
                  className="list-disc list-inside space-y-1 ml-4 text-white font-medium" 
                />
              ),
              li: ({ node, ...props }) => (
                <li 
                  {...props} 
                  className="break-words text-white font-medium" 
                />
              ),
              code: ({ node, ...props }) => (
                <code 
                  {...props} 
                  className="bg-white/20 text-white px-2 py-1 rounded-lg text-sm font-mono font-semibold break-all" 
                />
              ),
              pre: ({ node, children, ...props }) => {
                const textContent = children && typeof children === 'object' && children.props && children.props.children 
                  ? String(children.props.children) 
                  : String(children);
                const preIndex = `user-pre-${Math.random()}`;
                
                return (
                  <div className="relative group">
                    <pre 
                      {...props} 
                      className="overflow-x-auto whitespace-pre-wrap break-words bg-white/10 rounded-lg p-3 text-sm font-mono mt-2 pr-12" 
                    />
                    <button
                      onClick={() => copyToClipboard(textContent, preIndex)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center space-x-1 px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition-all cursor-pointer"
                      title="Copy code"
                    >
                      {copiedStates[preIndex] ? (
                        <>
                          <Check className="w-3 h-3 text-green-300" />
                          <span className="text-green-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-white/80" />
                          <span className="text-white/80">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              },
              strong: ({ node, ...props }) => (
                <strong 
                  {...props} 
                />
              ),
              b: ({ node, ...props }) => (
                <strong 
                  {...props} 
                />
              ),
            }}
          >
            {typeof message.content === 'string' ? message.content : ''}
          </ReactMarkdown>
          </div>
        </>
      )}
    </div>
  );
}

export default Message;