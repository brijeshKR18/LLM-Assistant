export default function QueryInput({ query, setQuery }) {
  return (
    <textarea
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const submitButton = document.querySelector('button');
          if (submitButton) submitButton.click();
        }
      }}
      placeholder="Type your message here..."
      className="w-full rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all duration-200 pl-4 pr-16 py-3 text-gray-800 bg-white shadow-sm resize-none min-h-[56px] max-h-[200px]"
      rows={1}
      spellCheck={true}
      autoFocus
    />
  );
}
