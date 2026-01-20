import { NextResponse } from 'next/server';
import { loadReferences } from '@/lib/storage';

export async function GET() {
  try {
    const references = await loadReferences();

    return NextResponse.json(references);
  } catch (error) {
    console.error('Error loading references:', error);
    return NextResponse.json(
      { error: 'Failed to load reference files' },
      { status: 500 }
    );
  }
}
