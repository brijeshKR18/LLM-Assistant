import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

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
    const selectedModel = models.find(model => model.id === value) || models[0];

    return (
        <div className="relative">
            <Listbox value={value} onChange={onChange} disabled={disabled}>
                <div className="relative">
                    <Listbox.Button as={motion.button}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
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
                    </Listbox.Button>

                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options className="absolute bottom-full mb-2 max-h-60 w-72 overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                            {models.map((model) => (
                                <Listbox.Option
                                    key={model.id}
                                    className={({ active }) =>
                                        `relative cursor-pointer select-none py-3 pl-10 pr-4 ${
                                            active ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'
                                        }`
                                    }
                                    value={model.id}
                                >
                                    {({ selected }) => (
                                        <>
                                            <div className="flex flex-col">
                                                <span
                                                    className={`block truncate font-medium ${
                                                        selected ? 'text-indigo-600' : 'text-gray-900'
                                                    }`}
                                                >
                                                    {model.name}
                                                </span>
                                                <span className="text-xs text-gray-500 mt-1">
                                                    {model.description}
                                                </span>
                                            </div>
                                            {selected ? (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>
        </div>
    );
}

export default ModelSelector;
