/**
 * File Validation Logic
 *
 * Validates uploaded files for the document rewriter.
 */

export interface ProcessedFile {
  name: string;
  content: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  files: ProcessedFile[];
}

// Validation constants
const MAX_FILES = 200;
const MAX_TOTAL_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Validate a list of files for processing
 */
export function validateFiles(files: ProcessedFile[]): ValidationResult {
  // Check file count
  if (files.length === 0) {
    return {
      valid: false,
      error: 'No files provided',
      files: [],
    };
  }

  if (files.length > MAX_FILES) {
    return {
      valid: false,
      error: `Too many files. Maximum is ${MAX_FILES}, got ${files.length}`,
      files: [],
    };
  }

  // Check all files have .txt extension
  const invalidFiles = files.filter(
    (f) => !f.name.toLowerCase().endsWith('.txt')
  );

  if (invalidFiles.length > 0) {
    return {
      valid: false,
      error: `Invalid file types: ${invalidFiles.map((f) => f.name).join(', ')}. Only .txt files are accepted.`,
      files: [],
    };
  }

  // Check for empty files
  const emptyFiles = files.filter((f) => !f.content || f.content.trim() === '');

  if (emptyFiles.length > 0) {
    return {
      valid: false,
      error: `Empty files detected: ${emptyFiles.map((f) => f.name).join(', ')}`,
      files: [],
    };
  }

  // Check total size
  const totalSize = files.reduce((sum, f) => sum + f.content.length, 0);

  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Total file size too large. Maximum is 10MB, got ${sizeMB}MB`,
      files: [],
    };
  }

  return {
    valid: true,
    files,
  };
}

/**
 * Validate a reference file for upload
 */
export function validateReferenceFile(
  content: string,
  filename: string
): { valid: boolean; error?: string } {
  const validExtensions = ['.md', '.txt'];
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));

  if (!validExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file type: ${filename}. Only .md and .txt files are accepted for reference slots.`,
    };
  }

  if (!content || content.trim() === '') {
    return {
      valid: false,
      error: `File is empty: ${filename}`,
    };
  }

  // Check file size (max 1MB for reference files)
  if (content.length > 1024 * 1024) {
    return {
      valid: false,
      error: `Reference file too large: ${filename}. Maximum is 1MB.`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize a filename for safe storage/output
 * Preserves folder structure but sanitizes each path component
 */
export function sanitizeFilename(filename: string): string {
  // Normalize path separators to forward slashes
  const normalized = filename.replace(/\\/g, '/');

  // Split into path components, sanitize each, and rejoin
  const parts = normalized.split('/');
  const sanitizedParts = parts.map((part) =>
    part
      .replace(/[<>:"|?*]/g, '_')
      .replace(/_{2,}/g, '_')
      .trim()
  );

  return sanitizedParts.join('/');
}

/**
 * Get just the filename from a path (for display purposes)
 */
export function getDisplayName(filepath: string): string {
  const normalized = filepath.replace(/\\/g, '/');
  return normalized.split('/').pop() || filepath;
}
