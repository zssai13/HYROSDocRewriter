'use client';

import { useCallback, useRef } from 'react';

export interface ReferenceFile {
  content: string;
  filename: string;
  savedAt: string;
}

export interface ReferenceSlotsProps {
  rulesSystem: ReferenceFile | null;
  rewriteGuide: ReferenceFile | null;
  staffDocs: ReferenceFile | null;
  onUpload: (slot: 'rulesSystem' | 'rewriteGuide' | 'staffDocs', file: File) => Promise<void>;
  isLoading: Record<string, boolean>;
}

interface SlotCardProps {
  label: string;
  description: string;
  slotName: 'rulesSystem' | 'rewriteGuide' | 'staffDocs';
  data: ReferenceFile | null;
  onUpload: (slot: 'rulesSystem' | 'rewriteGuide' | 'staffDocs', file: File) => Promise<void>;
  isLoading: boolean;
  required?: boolean;
}

function SlotCard({
  label,
  description,
  slotName,
  data,
  onUpload,
  isLoading,
  required = false,
}: SlotCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');

      const file = e.dataTransfer.files[0];
      if (file) {
        await onUpload(slotName, file);
      }
    },
    [onUpload, slotName]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(slotName, file);
    }
    // Reset input
    e.target.value = '';
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`
        relative flex flex-col rounded-lg border-2 border-dashed p-4 transition-all
        cursor-pointer hover:border-blue-400 hover:bg-gray-50
        ${data ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-white'}
        ${isLoading ? 'opacity-60 pointer-events-none' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".md,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">{label}</h3>
        {required && !data && (
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Required</span>
        )}
        {data && (
          <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Loaded
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 mb-3">{description}</p>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : data ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-gray-700 truncate" title={data.filename}>
            {data.filename}
          </p>
          <p className="text-xs text-gray-400">{formatDate(data.savedAt)}</p>
          <p className="text-xs text-blue-500 mt-2">Click or drop to replace</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 text-gray-400">
          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-xs">Drop file or click to browse</span>
        </div>
      )}
    </div>
  );
}

export default function ReferenceSlots({
  rulesSystem,
  rewriteGuide,
  staffDocs,
  onUpload,
  isLoading,
}: ReferenceSlotsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Reference Documents</h2>
      <p className="text-sm text-gray-500 mb-4">
        Upload reference files that Claude will use as context when rewriting documents.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SlotCard
          label="Rules System"
          description="The marker system and document structure rules"
          slotName="rulesSystem"
          data={rulesSystem}
          onUpload={onUpload}
          isLoading={isLoading.rulesSystem || false}
          required
        />
        <SlotCard
          label="Rewriting Guide"
          description="Instructions for converting documentation"
          slotName="rewriteGuide"
          data={rewriteGuide}
          onUpload={onUpload}
          isLoading={isLoading.rewriteGuide || false}
        />
        <SlotCard
          label="Staff Documentation"
          description="Additional context and staff notes"
          slotName="staffDocs"
          data={staffDocs}
          onUpload={onUpload}
          isLoading={isLoading.staffDocs || false}
        />
      </div>
    </div>
  );
}
