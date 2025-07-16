import React, { useState } from "react";
import { motion } from "framer-motion";
import { PaperClipIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function FileUpload({ onFileUpload }) {
  const allowedExtensions = [".pdf", ".yaml", ".yml", ".sh", ".html"];
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        const errMsg = "Unsupported file type. Please upload a PDF, YAML, SH, or HTML file.";
        setError(errMsg);
        toast.error(errMsg);
        e.target.value = "";
        return;
      }
      setError("");
      onFileUpload(file);
    }
  };

  return (
    <motion.label
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.95 }}
      className="inline-flex items-center p-4 glass-card border border-white/30 hover:border-violet-300 text-gray-700 hover:text-violet-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group relative overflow-hidden"
    >
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
      
      <input
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept={allowedExtensions.join(",")}
      />
      <PaperClipIcon className="h-6 w-6 relative z-10 transition-transform duration-200 group-hover:rotate-12" />
    </motion.label>
  );
}

export default FileUpload;