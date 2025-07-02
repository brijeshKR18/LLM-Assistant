import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "react-feather";

export default function FileUploader({ setFile }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length) setFile(acceptedFiles[0]);
    },
    [setFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="mt-6 border-t border-gray-100 pt-6">
      <label className="block text-xs font-medium text-gray-500 mb-2">
        Context Files
      </label>
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center border border-dashed rounded-lg p-4 transition-all duration-200 cursor-pointer group ${
          isDragActive
            ? "border-red-500 bg-red-50/30"
            : "border-gray-200 hover:border-red-400 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud size={20} className="text-gray-400 mb-2 group-hover:text-red-500 transition-colors duration-200" />
        <p className="text-sm text-gray-600">
          {isDragActive
            ? "Drop file here..."
            : "Drop a file or click to upload"}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT, YAML</p>
      </div>
    </div>
  );
}
