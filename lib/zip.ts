/**
 * ZIP File Utilities
 *
 * Handles extraction and creation of ZIP archives using JSZip.
 */

import JSZip from 'jszip';
import type { ProcessedFile } from './validation';

/**
 * Extract .txt files from a ZIP archive
 * Preserves the full relative path for folder structure
 */
export async function extractZip(zipData: ArrayBuffer): Promise<ProcessedFile[]> {
  const zip = await JSZip.loadAsync(zipData);
  const files: ProcessedFile[] = [];

  // Get all files from the ZIP
  const filePromises: Promise<void>[] = [];

  zip.forEach((relativePath, zipEntry) => {
    // Skip directories and non-txt files
    if (zipEntry.dir) return;
    if (!relativePath.toLowerCase().endsWith('.txt')) return;

    // Skip hidden files and macOS resource files
    const filename = relativePath.split('/').pop() || relativePath;
    if (filename.startsWith('.')) return;
    if (relativePath.includes('__MACOSX')) return;

    const promise = zipEntry.async('string').then((content) => {
      files.push({
        // Preserve the full relative path for folder structure
        name: relativePath,
        content,
      });
    });

    filePromises.push(promise);
  });

  await Promise.all(filePromises);

  return files;
}

/**
 * Create a ZIP archive from processed files
 */
export async function createZip(files: ProcessedFile[]): Promise<Buffer> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.name, file.content);
  }

  // Generate the ZIP as a Node.js Buffer
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return zipBuffer;
}

/**
 * Create a ZIP archive and return as base64 string
 */
export async function createZipBase64(files: ProcessedFile[]): Promise<string> {
  const buffer = await createZip(files);
  return buffer.toString('base64');
}
