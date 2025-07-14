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
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="inline-flex items-center p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full shadow-sm transition-colors cursor-pointer"
    >
      <input
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept={allowedExtensions.join(",")}
      />
      <PaperClipIcon className="h-5 w-5" />
    </motion.label>
  );
}

export default FileUpload;