/**
 * Storage Abstraction Layer
 *
 * Phase 1 (Local): Uses file-based JSON storage
 * Phase 2 (Vercel): Uses Vercel KV (Redis)
 *
 * The abstraction automatically detects the environment
 * and uses the appropriate storage backend.
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface ReferenceFile {
  content: string;
  filename: string;
  savedAt: string;
}

export interface ReferenceSlots {
  rulesSystem: ReferenceFile | null;
  rewriteGuide: ReferenceFile | null;
  staffDocs: ReferenceFile | null;
}

export type SlotName = 'rulesSystem' | 'rewriteGuide' | 'staffDocs';

// Path for local file storage (Phase 1)
const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'references.json');

/**
 * Check if we're running in Vercel (production)
 */
function isVercelEnvironment(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}

/**
 * Ensure the data directory exists (for local development)
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

/**
 * Load references from local file storage
 */
async function loadFromFile(): Promise<ReferenceSlots> {
  await ensureDataDir();

  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File doesn't exist or is invalid, return empty slots
    return {
      rulesSystem: null,
      rewriteGuide: null,
      staffDocs: null,
    };
  }
}

/**
 * Save references to local file storage
 */
async function saveToFile(slots: ReferenceSlots): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(STORAGE_FILE, JSON.stringify(slots, null, 2), 'utf-8');
}

/**
 * Load references from Vercel KV
 */
async function loadFromKV(): Promise<ReferenceSlots> {
  // Dynamic import to avoid issues when KV is not available
  const { kv } = await import('@vercel/kv');

  const data = await kv.get<ReferenceSlots>('reference-slots');

  return data || {
    rulesSystem: null,
    rewriteGuide: null,
    staffDocs: null,
  };
}

/**
 * Save references to Vercel KV
 */
async function saveToKV(slots: ReferenceSlots): Promise<void> {
  const { kv } = await import('@vercel/kv');
  await kv.set('reference-slots', slots);
}

/**
 * Load all reference slots
 */
export async function loadReferences(): Promise<ReferenceSlots> {
  if (isVercelEnvironment()) {
    return loadFromKV();
  }
  return loadFromFile();
}

/**
 * Save a reference file to a specific slot
 */
export async function saveReference(
  slot: SlotName,
  content: string,
  filename: string
): Promise<ReferenceFile> {
  const reference: ReferenceFile = {
    content,
    filename,
    savedAt: new Date().toISOString(),
  };

  const slots = await loadReferences();
  slots[slot] = reference;

  if (isVercelEnvironment()) {
    await saveToKV(slots);
  } else {
    await saveToFile(slots);
  }

  return reference;
}

/**
 * Clear a specific reference slot
 */
export async function clearReference(slot: SlotName): Promise<void> {
  const slots = await loadReferences();
  slots[slot] = null;

  if (isVercelEnvironment()) {
    await saveToKV(slots);
  } else {
    await saveToFile(slots);
  }
}
