import ReactMarkdown from 'react-markdown';
import { CircleAlert } from 'lucide-react';

function Message({ message }) {
  if (message.role === 'system') {
    return (
      <div className="message text-center text-gray-500 dark:text-gray-400">
        {message.content}
      </div>
    );
  }

  if (message.error) {
    return (
      <div className=" message assistant-message rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-700/40 text-red-800 dark:text-red-600 px-4 py-3 shadow-sm flex items-center gap-2">
        <CircleAlert className="w-6 h-6 text-red-500 dark:text-red-600" />
        <span className="font-medium">{message.content}</span>
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
    <div className={`message min-w-0 overflow-hidden ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
      {message.role === 'assistant' && !message.error ? (
        <>
          <div>
            {parts.map((part, idx) =>
              part.type === 'code' ? (
                <div
                  key={idx}
                  className="bg-gray-600 text-gray-300 rounded-md p-4 my-2 overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <ReactMarkdown>{'```\n' + part.value + '\n```'}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div key={idx} className="prose prose-sm dark:prose-invert max-w-none space-y-4 break-words overflow-wrap-anywhere">
                  <ReactMarkdown
                    components={{
                      p: ({node, ...props}) => <p {...props} className="mb-4 break-words" />,
                      ol: ({node, ...props}) => <ol {...props} style={{ listStyleType: 'decimal', paddingLeft: '1.5em' }} />,
                      li: ({node, ...props}) => <li {...props} style={{ marginBottom: '0.25em' }} className="break-words" />,
                      code: ({node, ...props}) => <code {...props} className="break-all" />,
                      pre: ({node, ...props}) => <pre {...props} className="overflow-x-auto whitespace-pre-wrap break-words" />,
                    }}
                  >
                    {part.value}
                  </ReactMarkdown>
                </div>
              )
            )}
          </div>
          {message.sources && message.sources.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Sources: {message.sources.map((src) => src.filename || src.resource).join(', ')}
            </div>
          )}
        </>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 break-words overflow-wrap-anywhere">
          <ReactMarkdown
            components={{
              p: ({node, ...props}) => <p {...props} className="mb-1 break-words" />,
              ol: ({node, ...props}) => <ol {...props} style={{ listStyleType: 'decimal', paddingLeft: '1.5em'}} />,
              li: ({node, ...props}) => <li {...props} style={{ marginBottom: '0.25em' }} className="break-words" />,
              code: ({node, ...props}) => <code {...props} className="break-all" />,
              pre: ({node, ...props}) => <pre {...props} className="overflow-x-auto whitespace-pre-wrap break-words" />,
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