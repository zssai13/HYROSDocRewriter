'use client';

import type { ProcessingState } from './ProgressDisplay';

export interface ActionButtonsProps {
  canStart: boolean;
  state: ProcessingState;
  onStart: () => void;
  onDownload: () => void;
  onReset: () => void;
  hasZip: boolean;
}

export default function ActionButtons({
  canStart,
  state,
  onStart,
  onDownload,
  onReset,
  hasZip,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {/* Start Processing Button */}
      {state === 'idle' && (
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`
            px-8 py-3 rounded-lg font-semibold text-white transition-all
            ${
              canStart
                ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                : 'bg-gray-300 cursor-not-allowed'
            }
          `}
        >
          Start Processing
        </button>
      )}

      {/* Preparing indicator */}
      {state === 'preparing' && (
        <button
          disabled
          className="px-8 py-3 rounded-lg font-semibold text-white bg-blue-400 cursor-not-allowed flex items-center gap-2"
        >
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          Preparing...
        </button>
      )}

      {/* Processing indicator */}
      {state === 'processing' && (
        <button
          disabled
          className="px-8 py-3 rounded-lg font-semibold text-white bg-blue-400 cursor-not-allowed flex items-center gap-2"
        >
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          Processing...
        </button>
      )}

      {/* Download Button */}
      {(state === 'complete' || (state === 'error' && hasZip)) && hasZip && (
        <button
          onClick={onDownload}
          className="px-8 py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download ZIP
        </button>
      )}

      {/* Reset Button */}
      {(state === 'complete' || state === 'error') && (
        <button
          onClick={onReset}
          className="px-8 py-3 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
        >
          Reset
        </button>
      )}

      {/* Help text for disabled state */}
      {state === 'idle' && !canStart && (
        <p className="w-full text-center text-sm text-gray-500">
          Upload the Rules System reference and some documents to start
        </p>
      )}
    </div>
  );
}
