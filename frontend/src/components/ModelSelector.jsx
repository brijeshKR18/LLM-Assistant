import React from "react";

export default function ModelSelector({ model, setModel }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="model-selector" className="text-xs font-medium text-gray-500">
        AI Model
      </label>
      <select
        id="model-selector"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all duration-200 w-full bg-white text-sm text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <option value="mistral:instruct">Mistral</option>
        <option value="llama3:8b">LLaMA-3</option>
      </select>
    </div>
  );
}
