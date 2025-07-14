import React from 'react';

const EnvDebug = () => {
  const envVars = {
    VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    VITE_GOOGLE_CLIENT_SECRET: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
    VITE_GOOGLE_SCOPES: import.meta.env.VITE_GOOGLE_SCOPES,
    VITE_REDIRECT_URI: import.meta.env.VITE_REDIRECT_URI,
    VITE_DEV_FRONTEND_URL: import.meta.env.VITE_DEV_FRONTEND_URL,
    VITE_DEV_BACKEND_URL: import.meta.env.VITE_DEV_BACKEND_URL,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD
  };

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-md z-50">
      <h3 className="font-bold text-lg mb-2">Environment Debug</h3>
      <div className="space-y-1 text-sm">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="font-mono text-blue-600">{key}:</span>
            <span className="ml-2 text-gray-800 break-all">
              {value ? (key.includes('SECRET') ? '***hidden***' : value) : 'undefined'}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-gray-500">
        <div>Current URL: {window.location.href}</div>
        <div>Origin: {window.location.origin}</div>
      </div>
    </div>
  );
};

export default EnvDebug;
