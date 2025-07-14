import React, { useState, useRef, useEffect } from 'react';
import { ChevronUpDownIcon, CheckIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const models = [
    { 
        id: 'mistral:instruct', 
        name: 'Mistral Instruct', 
        description: 'Fast and efficient reasoning' 
    },
    { 
        id: 'llama3.1:8b', 
        name: 'Llama 3.1 8B', 
        description: 'Balanced performance' 
    },
];

function ModelSelector({ value, onChange, disabled = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    
    const selectedModel = models.find(model => model.id === value) || models[0];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (modelId) => {
        onChange(modelId);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <motion.button
                whileHover={{ scale: disabled ? 1 : 1.05 }}
                whileTap={{ scale: disabled ? 1 : 0.95 }}
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className="relative w-full cursor-pointer rounded-full bg-gray-100 hover:bg-gray-200 py-3 px-4 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span className="flex items-center space-x-2">
                    <CpuChipIcon className="h-5 w-5 text-gray-600" />
                    <span className="block truncate text-sm font-medium text-gray-900">
                        {selectedModel.name}
                    </span>
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronUpDownIcon
                        className="h-4 w-4 text-gray-400"
                        aria-hidden="true"
                    />
                </span>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.1 }}
                        className="absolute bottom-full mb-2 right-0 w-64 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 z-50"
                        style={{
                            maxWidth: 'calc(100vw - 32px)',
                            transform: 'translateX(0)',
                        }}
                    >
                        <div className="py-1">
                            {models.map((model) => (
                                <button
                                    key={model.id}
                                    type="button"
                                    onClick={() => handleSelect(model.id)}
                                    className={`relative w-full cursor-pointer select-none py-3 pl-10 pr-4 text-left hover:bg-indigo-50 hover:text-indigo-900 ${
                                        model.id === value ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'
                                    }`}
                                >
                                    <div className="flex flex-col">
                                        <span
                                            className={`block truncate font-medium ${
                                                model.id === value ? 'text-indigo-600' : 'text-gray-900'
                                            }`}
                                        >
                                            {model.name}
                                        </span>
                                        <span className="text-xs text-gray-500 mt-1">
                                            {model.description}
                                        </span>
                                    </div>
                                    {model.id === value && (
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default React.memo(ModelSelector);
