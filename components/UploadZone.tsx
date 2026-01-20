'use client';

import { useCallback, useRef, useState } from 'react';

export interface UploadedFile {
  name: string;
  content: string;
}

export interface UploadZoneProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  error: string | null;
  onErrorChange: (error: string | null) => void;
  disabled?: boolean;
}

export default function UploadZone({
  files,
  onFilesChange,
  error,
  onErrorChange,
  disabled = false,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = useCallback(
    async (fileList: FileList) => {
      setIsProcessing(true);
      onErrorChange(null);

      try {
        const processedFiles: UploadedFile[] = [];

        for (const file of Array.from(fileList)) {
          // Handle ZIP files
          if (file.name.toLowerCase().endsWith('.zip')) {
            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(file);

            const promises: Promise<void>[] = [];

            zip.forEach((relativePath, zipEntry) => {
              // Skip directories and non-txt files
              if (zipEntry.dir) return;
              if (!relativePath.toLowerCase().endsWith('.txt')) return;

              // Skip hidden files and macOS resource files
              const filename = relativePath.split('/').pop() || relativePath;
              if (filename.startsWith('.') || filename.startsWith('__MACOSX')) return;

              const promise = zipEntry.async('string').then((content) => {
                processedFiles.push({
                  name: filename,
                  content,
                });
              });

              promises.push(promise);
            });

            await Promise.all(promises);
          }
          // Handle TXT files
          else if (file.name.toLowerCase().endsWith('.txt')) {
            const content = await file.text();
            processedFiles.push({
              name: file.name,
              content,
            });
          }
          // Invalid file type
          else {
            onErrorChange(`Invalid file type: ${file.name}. Only .txt and .zip files are accepted.`);
            setIsProcessing(false);
            return;
          }
        }

        // Validate
        if (processedFiles.length === 0) {
          onErrorChange('No valid .txt files found.');
          setIsProcessing(false);
          return;
        }

        if (processedFiles.length > 200) {
          onErrorChange(`Too many files. Maximum is 200, got ${processedFiles.length}.`);
          setIsProcessing(false);
          return;
        }

        // Check for empty files
        const emptyFiles = processedFiles.filter((f) => !f.content.trim());
        if (emptyFiles.length > 0) {
          onErrorChange(`Empty files detected: ${emptyFiles.map((f) => f.name).join(', ')}`);
          setIsProcessing(false);
          return;
        }

        // Check total size
        const totalSize = processedFiles.reduce((sum, f) => sum + f.content.length, 0);
        if (totalSize > 10 * 1024 * 1024) {
          onErrorChange(`Total file size too large. Maximum is 10MB.`);
          setIsProcessing(false);
          return;
        }

        onFilesChange(processedFiles);
      } catch (err) {
        onErrorChange(`Error processing files: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      setIsProcessing(false);
    },
    [onFilesChange, onErrorChange]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const fileList = e.dataTransfer.files;
      if (fileList.length > 0) {
        await processFiles(fileList);
      }
    },
    [disabled, processFiles]
  );

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      await processFiles(fileList);
    }
    // Reset input
    e.target.value = '';
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFilesChange([]);
    onErrorChange(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Documents</h2>

      <div
        className={`
          relative rounded-lg border-2 border-dashed p-8 transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-blue-400'}
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${files.length > 0 ? 'border-green-300 bg-green-50' : ''}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.zip"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
            <span className="text-gray-600">Processing files...</span>
          </div>
        ) : files.length > 0 ? (
          <div className="flex flex-col items-center justify-center py-4">
            <svg className="w-12 h-12 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-lg font-semibold text-gray-800">{files.length} files ready</p>
            <p className="text-sm text-gray-500 mt-1">Click or drop to replace</p>
            <button
              onClick={handleClear}
              className="mt-4 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear files
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-lg text-gray-600 mb-2">Drop TXT files or ZIP archive here</p>
            <p className="text-sm text-gray-400">or click to browse</p>
            <p className="text-xs text-gray-400 mt-4">Maximum 200 files, 10MB total</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
