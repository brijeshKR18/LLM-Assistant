import ReactMarkdown from 'react-markdown';
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
  const regex = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', value: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return (
    <div className={`min-w-0 overflow-hidden ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
      {message.role === 'assistant' && !message.error ? (
        <>
          <div>
            {parts.map((part, idx) =>
              part.type === 'code' ? (
                <div
                  key={idx}
                  className="bg-gradient-to-r from-gray-800 to-gray-900 text-gray-100 rounded-2xl p-6 my-4 overflow-hidden border border-gray-700 shadow-lg font-mono text-sm relative"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</span>
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
                    <ReactMarkdown
                      components={{
                        pre: ({ children }) => (
                          <pre className="bg-transparent p-0 m-0 text-sm leading-relaxed">
                            {children}
                          </pre>
                        ),
                        code: ({ children }) => (
                          <code className="text-gray-100 bg-transparent">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {'```\n' + part.value + '\n```'}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div key={idx} className="prose prose-gray dark:prose-invert max-w-none leading-relaxed break-words overflow-wrap-anywhere">
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => (
                        <p 
                          {...props} 
                          className="mb-4 break-words leading-relaxed text-gray-800 font-medium" 
                        />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol 
                          {...props} 
                          className="list-decimal list-inside space-y-2 ml-4 text-gray-800 font-medium" 
                        />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul 
                          {...props} 
                          className="list-disc list-inside space-y-2 ml-4 text-gray-800 font-medium" 
                        />
                      ),
                      li: ({ node, ...props }) => (
                        <li 
                          {...props} 
                          className="break-words leading-relaxed text-gray-800 font-medium mb-1" 
                        />
                      ),
                      code: ({ node, ...props }) => (
                        <code 
                          {...props} 
                          className="bg-violet-100 text-violet-800 px-2 py-1 rounded-lg text-sm font-mono font-semibold break-all" 
                        />
                      ),
                      pre: ({ node, children, ...props }) => {
                        const textContent = children && typeof children === 'object' && children.props && children.props.children 
                          ? String(children.props.children) 
                          : String(children);
                        const preIndex = `pre-${idx}-${Math.random()}`;
                        
                        return (
                          <div className="relative group">
                            <pre 
                              {...props} 
                              className="overflow-x-auto whitespace-pre-wrap break-words bg-gray-100 rounded-lg p-4 text-sm font-mono pr-12" 
                            />
                            <button
                              onClick={() => copyToClipboard(textContent, preIndex)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center space-x-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs transition-all cursor-pointer"
                              title="Copy code"
                            >
                              {copiedStates[preIndex] ? (
                                <>
                                  <Check className="w-3 h-3 text-green-600" />
                                  <span className="text-green-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-gray-600" />
                                  <span className="text-gray-600">Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      },
                      h1: ({ node, ...props }) => (
                        <h1 
                          {...props} 
                          className="text-2xl font-bold text-gray-900 mb-4 mt-6" 
                        />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 
                          {...props} 
                          className="text-xl font-bold text-gray-900 mb-3 mt-5" 
                        />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 
                          {...props} 
                          className="text-lg font-bold text-gray-900 mb-2 mt-4" 
                        />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote 
                          {...props} 
                          className="border-l-4 border-violet-500 bg-violet-50 pl-4 py-2 my-4 italic text-gray-700 font-medium" 
                        />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong 
                          {...props} 
                          className="font-bold text-gray-900" 
                        />
                      ),
                    }}
                  >
                    {part.value}
                  </ReactMarkdown>
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
              <div className="text-sm text-violet-800 font-medium">
                {message.sources.map((src, index) => (
                  <span key={index} className="inline-block bg-white px-2 py-1 rounded-lg border border-violet-200 mr-2 mb-1">
                    {src.filename || src.resource}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
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
                  className="font-bold text-white" 
                />
              ),
            }}
          >
            {typeof message.content === 'string' ? message.content : ''}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default Message;