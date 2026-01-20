# HYROS Doc Rewriter

A web application that batch-converts legacy HYROS platform documentation into the new Rules System format using Claude AI.

## Features

- **Reference Slots**: Upload 3 reference documents that Claude uses as context:
  - Rules System (required) - The marker system and document structure
  - Rewriting Guide - Conversion instructions
  - Staff Documentation - Additional context

- **Bulk Upload**: Drag-and-drop TXT files or ZIP archives (up to 200 files, 10MB total)

- **Real-time Progress**: SSE-powered progress updates during processing

- **ZIP Download**: Download all rewritten files in a single ZIP archive

## Setup

### Phase 1: Local Development

1. **Install dependencies:**
   ```bash
   cd webapp
   npm install
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env.local` and add your Anthropic API key:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and replace `sk-ant-YOUR_API_KEY_HERE` with your actual API key.

   Get your API key from: https://console.anthropic.com/

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open the app:**
   Navigate to http://localhost:3000

### Phase 2: Vercel Deployment

1. **Create a Vercel project:**
   - Connect your GitHub repository, or
   - Deploy directly using `vercel` CLI

2. **Set up Vercel KV:**
   - Go to your Vercel project settings
   - Navigate to Storage > Create Database > KV
   - This will automatically add KV environment variables

3. **Configure environment variables:**
   In Vercel project settings, add:
   - `ANTHROPIC_API_KEY`: Your Anthropic API key

4. **Deploy:**
   ```bash
   vercel --prod
   ```

## Usage

1. **Upload Reference Documents:**
   - Upload your Rules System document to Slot 1 (required)
   - Optionally upload Rewriting Guide to Slot 2
   - Optionally upload Staff Documentation to Slot 3

2. **Upload Documents to Convert:**
   - Drag and drop .txt files into the upload zone
   - Or upload a .zip file containing .txt files

3. **Start Processing:**
   - Click "Start Processing"
   - Watch real-time progress as each file is processed

4. **Download Results:**
   - Once complete, the ZIP file downloads automatically
   - Click "Reset" to process another batch

## Architecture

```
webapp/
├── app/
│   ├── page.tsx              # Main application page
│   ├── layout.tsx            # Root layout
│   └── api/
│       ├── references/       # Reference file management
│       │   ├── save/         # Save reference to storage
│       │   └── load/         # Load all references
│       └── rewrite/          # Main processing endpoint (SSE)
│
├── components/
│   ├── ReferenceSlots.tsx    # 3-slot reference manager
│   ├── UploadZone.tsx        # Drag-drop upload area
│   ├── ProgressDisplay.tsx   # Progress bar and status
│   └── ActionButtons.tsx     # Start/Download/Reset buttons
│
├── lib/
│   ├── storage.ts            # Storage abstraction (file/KV)
│   ├── validation.ts         # File validation logic
│   ├── zip.ts                # JSZip utilities
│   ├── claude.ts             # Anthropic API wrapper
│   └── prompts.ts            # System prompt builder
│
├── data/                     # Local storage (Phase 1 only)
├── .env.local                # Local environment variables
└── vercel.json               # Vercel configuration
```

## Storage Behavior

- **Local Development**: Reference files are stored in `data/references.json`
- **Vercel Production**: Reference files are stored in Vercel KV (Redis)

The storage layer automatically detects the environment and uses the appropriate backend.

## API Endpoints

### POST /api/references/save
Save a reference file to a specific slot.

```json
{
  "slot": "rulesSystem" | "rewriteGuide" | "staffDocs",
  "content": "file content...",
  "filename": "RULES-SYSTEM.md"
}
```

### GET /api/references/load
Load all reference files from storage.

### POST /api/rewrite
Process files and return rewritten versions via SSE.

**Request:**
```json
{
  "files": [{"name": "doc.txt", "content": "..."}],
  "references": {...}
}
```

**SSE Events:**
- `progress`: `{"current": 1, "total": 10, "filename": "doc.txt"}`
- `complete`: `{"zipBase64": "...", "totalProcessed": 10}`
- `error`: `{"message": "...", "failedAt": 5, "filename": "bad.txt"}`

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **ZIP Handling**: JSZip
- **Storage**: File-based (local) / Vercel KV (production)
- **Streaming**: Server-Sent Events (SSE)
