/** A single exhibit file uploaded by the user */
export interface ExhibitFile {
  id: string
  label: string          // "Exhibit A", "Exhibit 1", etc.
  file: File
  url: string            // Object URL for preview/download
  pageCount?: number
}

/** A citation found in the brief text */
export interface Citation {
  id: string
  text: string           // The matched text, e.g. "Exhibit A"
  normalizedLabel: string // Normalized label for matching, e.g. "A" or "1"
  startIndex: number     // Character offset in extracted text
  endIndex: number
  pageNumber: number     // PDF page where citation appears
  exhibitId?: string     // Linked exhibit ID (if mapped)
}

/** Extracted text from a single PDF page */
export interface PageText {
  pageNumber: number
  text: string
  startOffset: number    // Global character offset where this page starts
}

/** Result of parsing a brief */
export interface BriefParseResult {
  pages: PageText[]
  citations: Citation[]
  fullText: string
}

/** Processing status for the workflow */
export type WorkflowStep = 'upload' | 'processing' | 'review' | 'download'

/** Overall app state */
export interface AppState {
  step: WorkflowStep
  briefFile: File | null
  briefParseResult: BriefParseResult | null
  exhibits: ExhibitFile[]
  citations: Citation[]
  autoMapCount: number
  linkedPdfUrl: string | null
  error: string | null
}
