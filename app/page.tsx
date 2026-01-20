'use client';

import { useCallback, useEffect, useState } from 'react';
import ReferenceSlots, { type ReferenceFile } from '@/components/ReferenceSlots';
import UploadZone, { type UploadedFile } from '@/components/UploadZone';
import ProgressDisplay, { type ProcessingState } from '@/components/ProgressDisplay';
import ActionButtons from '@/components/ActionButtons';

interface References {
  rulesSystem: ReferenceFile | null;
  rewriteGuide: ReferenceFile | null;
  staffDocs: ReferenceFile | null;
}

export default function Home() {
  // Reference slots state
  const [references, setReferences] = useState<References>({
    rulesSystem: null,
    rewriteGuide: null,
    staffDocs: null,
  });
  const [refLoading, setRefLoading] = useState<Record<string, boolean>>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Upload state
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Processing state
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, filename: '' });
  const [processingError, setProcessingError] = useState<string | undefined>();

  // Result state
  const [zipBase64, setZipBase64] = useState<string | null>(null);

  // Load references on mount
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const response = await fetch('/api/references/load');
        if (response.ok) {
          const data = await response.json();
          setReferences(data);
        }
      } catch (error) {
        console.error('Failed to load references:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadRefs();
  }, []);

  // Handle reference upload
  const handleReferenceUpload = useCallback(
    async (slot: 'rulesSystem' | 'rewriteGuide' | 'staffDocs', file: File) => {
      setRefLoading((prev) => ({ ...prev, [slot]: true }));

      try {
        const content = await file.text();

        const response = await fetch('/api/references/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot,
            content,
            filename: file.name,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save reference');
        }

        const result = await response.json();

        setReferences((prev) => ({
          ...prev,
          [slot]: {
            content,
            filename: file.name,
            savedAt: result.savedAt,
          },
        }));
      } catch (error) {
        console.error('Failed to upload reference:', error);
        alert(error instanceof Error ? error.message : 'Failed to upload reference file');
      } finally {
        setRefLoading((prev) => ({ ...prev, [slot]: false }));
      }
    },
    []
  );

  // Check if we can start processing
  const canStart = references.rulesSystem !== null && files.length > 0;

  // Start processing
  const handleStart = useCallback(async () => {
    if (!canStart) return;

    setProcessingState('preparing');
    setProcessingError(undefined);
    setZipBase64(null);
    setProgress({ current: 0, total: files.length, filename: '' });

    try {
      console.log(`Starting processing of ${files.length} files...`);

      const payload = JSON.stringify({
        files,
        references,
      });
      console.log(`Payload size: ${(payload.length / 1024).toFixed(1)} KB`);

      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', response.status, errorText);
        throw new Error(`Failed to start processing: ${response.status}`);
      }

      console.log('SSE connection established, reading stream...');

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines
        const events = buffer.split('\n\n');
        // Keep the last incomplete event in the buffer
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue;

          const lines = eventBlock.split('\n');
          let eventType = '';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6);
            }
          }

          if (eventType && eventData) {
            try {
              const data = JSON.parse(eventData);

              if (eventType === 'progress') {
                console.log(`Progress: ${data.current}/${data.total} - ${data.filename}`);
                // Switch from 'preparing' to 'processing' on first progress event
                setProcessingState('processing');
                setProgress({
                  current: data.current,
                  total: data.total,
                  filename: data.filename,
                });
              } else if (eventType === 'complete') {
                console.log(`Complete! Processed ${data.totalProcessed} files, ZIP size: ${(data.zipBase64?.length / 1024).toFixed(1)} KB`);
                setZipBase64(data.zipBase64);
                setProgress((prev) => ({ ...prev, current: prev.total }));
                setProcessingState('complete');
              } else if (eventType === 'error') {
                console.error('Processing error from server:', data.message);
                setProcessingError(data.message);
                setProcessingState('error');
                if (data.failedAt) {
                  setProgress((prev) => ({
                    ...prev,
                    current: data.failedAt,
                    filename: data.filename || prev.filename,
                  }));
                }
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', eventData, e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingError(error instanceof Error ? error.message : 'Unknown error occurred');
      setProcessingState('error');
    }
  }, [canStart, files, references]);

  // Download ZIP
  const handleDownload = useCallback(() => {
    if (!zipBase64) return;

    // Create filename with timestamp
    const filename = `rewritten-docs-${new Date().toISOString().slice(0, 10)}.zip`;

    // Use data URL approach for more reliable downloads
    const dataUrl = `data:application/zip;base64,${zipBase64}`;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);

    // Small delay to ensure browser processes the element
    setTimeout(() => {
      a.click();
      document.body.removeChild(a);
    }, 100);
  }, [zipBase64]);

  // Reset
  const handleReset = useCallback(() => {
    setFiles([]);
    setUploadError(null);
    setProcessingState('idle');
    setProgress({ current: 0, total: 0, filename: '' });
    setProcessingError(undefined);
    setZipBase64(null);
  }, []);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HYROS Doc Rewriter</h1>
          <p className="text-gray-600">
            Batch convert documentation to the Rules System format using Claude AI
          </p>
        </div>

        {/* Reference Slots */}
        <ReferenceSlots
          rulesSystem={references.rulesSystem}
          rewriteGuide={references.rewriteGuide}
          staffDocs={references.staffDocs}
          onUpload={handleReferenceUpload}
          isLoading={refLoading}
        />

        {/* Upload Zone */}
        <UploadZone
          files={files}
          onFilesChange={setFiles}
          error={uploadError}
          onErrorChange={setUploadError}
          disabled={processingState === 'processing'}
        />

        {/* Progress Display */}
        <ProgressDisplay
          state={processingState}
          current={progress.current}
          total={progress.total}
          currentFilename={progress.filename}
          error={processingError}
        />

        {/* Action Buttons */}
        <ActionButtons
          canStart={canStart}
          state={processingState}
          onStart={handleStart}
          onDownload={handleDownload}
          onReset={handleReset}
          hasZip={zipBase64 !== null}
        />
      </div>
    </div>
  );
}
