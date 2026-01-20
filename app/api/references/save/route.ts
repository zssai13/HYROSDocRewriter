import { NextRequest, NextResponse } from 'next/server';
import { saveReference, type SlotName } from '@/lib/storage';
import { validateReferenceFile } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { slot, content, filename } = body as {
      slot: string;
      content: string;
      filename: string;
    };

    // Validate slot name
    const validSlots: SlotName[] = ['rulesSystem', 'rewriteGuide', 'staffDocs'];
    if (!validSlots.includes(slot as SlotName)) {
      return NextResponse.json(
        { error: `Invalid slot name: ${slot}. Must be one of: ${validSlots.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate content and filename
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: 'Filename is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate the reference file
    const validation = validateReferenceFile(content, filename);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Save the reference
    const saved = await saveReference(slot as SlotName, content, filename);

    return NextResponse.json({
      success: true,
      slot,
      savedAt: saved.savedAt,
    });
  } catch (error) {
    console.error('Error saving reference:', error);
    return NextResponse.json(
      { error: 'Failed to save reference file' },
      { status: 500 }
    );
  }
}
