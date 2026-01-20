'use client';

export type ProcessingState = 'idle' | 'preparing' | 'processing' | 'complete' | 'error';

export interface ProgressDisplayProps {
  state: ProcessingState;
  current: number;
  total: number;
  currentFilename: string;
  error?: string;
}

export default function ProgressDisplay({
  state,
  current,
  total,
  currentFilename,
  error,
}: ProgressDisplayProps) {
  if (state === 'idle') {
    return null;
  }

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Progress</h2>

      {state === 'preparing' && (
        <div className="flex flex-col items-center justify-center py-6">
          {/* Animated loading bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '100%' }}>
              <div className="h-full w-1/3 bg-blue-400 animate-[shimmer_1.5s_infinite]"
                   style={{
                     animation: 'shimmer 1.5s infinite',
                     background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                   }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <span className="text-gray-600">Preparing {total} files for processing...</span>
          </div>
          <p className="text-sm text-gray-400 mt-2">Uploading and connecting to Claude API</p>
        </div>
      )}

      {state === 'processing' && (
        <>
          {/* Progress bar */}
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {current} of {total} files
            </span>
            <span className="text-sm font-medium text-blue-600">{percentage}%</span>
          </div>

          {/* Current file */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span>Processing:</span>
            <span className="font-medium text-gray-700 truncate" title={currentFilename}>
              {currentFilename}
            </span>
          </div>
        </>
      )}

      {state === 'complete' && (
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-semibold text-green-800">Processing complete!</p>
            <p className="text-sm text-green-600">
              Successfully processed {total} files
            </p>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold text-red-800">Processing failed</p>
              {current > 0 && (
                <p className="text-sm text-red-600 mb-2">
                  Failed at file {current} of {total}
                </p>
              )}
              {error && (
                <p className="text-sm text-red-700 bg-red-100 p-2 rounded mt-2">{error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
