import React, { useState } from 'react';
import { CpuChipIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const models = [
    { 
        id: 'mistral:instruct', 
        name: 'Mistral', 
        color: 'blue',
        description: 'Fast reasoning'
    },
    { 
        id: 'llama3.1:8b', 
        name: 'Llama', 
        color: 'purple',
        description: 'Balanced performance'
    },
];

function ModelSelector({ value, onChange, disabled = false }) {
    const currentIndex = models.findIndex(model => model.id === value);
    const selectedModel = models[currentIndex] || models[0];
    const nextModel = models[(currentIndex + 1) % models.length];

    const handleToggle = () => {
        if (!disabled) {
            onChange(nextModel.id);
        }
    };

    return (
        <div className="relative">
            {/* Toggle Button - Matching FileUpload and Send Button Style */}
            <motion.button
                whileHover={{ scale: disabled ? 1 : 1.05, y: disabled ? 0 : -1 }}
                whileTap={{ scale: disabled ? 1 : 0.95 }}
                onClick={handleToggle}
                disabled={disabled}
                className={`p-4 glass-card border border-white/30 rounded-2xl shadow-lg transition-all duration-200 group relative overflow-hidden ${
                    disabled 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'hover:border-violet-300 hover:shadow-xl cursor-pointer'
                }`}
                title={disabled ? 'Model selection disabled during generation' : `Switch to ${nextModel.name}`}
            >
                {/* Hover effect overlay - matching other components */}
                {!disabled && (
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                )}
                
                {/* Content with proper z-index */}
                <div className="relative z-10 flex items-center space-x-2">
                    <CpuChipIcon className={`h-6 w-6 transition-all duration-200 ${
                        disabled 
                            ? 'text-gray-400'
                            : selectedModel.color === 'blue' ? 'text-blue-600 group-hover:text-violet-700' : 'text-purple-600 group-hover:text-violet-700'
                    }`} />
                    <span className={`font-medium text-sm transition-colors duration-200 ${
                        disabled 
                            ? 'text-gray-400'
                            : 'text-gray-700 group-hover:text-violet-700'
                    }`}>
                        {selectedModel.name}
                    </span>
                </div>
            </motion.button>
        </div>
    );
}

export default ModelSelector;
