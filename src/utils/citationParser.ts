import type { Citation, PageText, BriefParseResult } from './types'

/**
 * Regex patterns that match common exhibit citation formats in legal briefs.
 * Captures the exhibit identifier (letter, number, or compound label).
 *
 * Matches: Exhibit A, Exhibit 1, Ex. A, Ex. 1, Exh. A-1, Exhibit "A",
 *          Exhibit A-1, Exhibits A and B, Exhibit A at 5, (Ex. A),
 *          Exhibit A, pp. 10-12, Exhibit AA, Exhibit 101
 */
const CITATION_PATTERNS = [
  // "Exhibit A", "Exhibit 1", "Exhibit A-1", "Exhibit AA", "Exhibit 101"
  /\bExhibit\s+"?([A-Z]{1,3}(?:-\d+)?|\d{1,4})"?\b/gi,
  // "Ex. A", "Ex. 1", "Ex. A-1"
  /\bEx\.\s*"?([A-Z]{1,3}(?:-\d+)?|\d{1,4})"?\b/gi,
  // "Exh. A", "Exh. 1"
  /\bExh\.\s*"?([A-Z]{1,3}(?:-\d+)?|\d{1,4})"?\b/gi,
  // "Attachment A", "Attachment 1" (federal complaints — FTC v. Amazon pattern)
  /\bAttachment\s+"?([A-Z]{1,3}(?:-\d+)?|\d{1,4})"?\b/gi,
  // "Att. A", "Att. 1"
  /\bAtt\.\s*"?([A-Z]{1,3}(?:-\d+)?|\d{1,4})"?\b/gi,
  // "Exhibits A and B" / "Exhibits A, B, and C" — captures individual refs from compound
  /\bExhibits\s+([A-Z]{1,3}(?:-\d+)?|\d{1,4})(?:\s*(?:,|and|&)\s+([A-Z]{1,3}(?:-\d+)?|\d{1,4}))+\b/gi,
  // "Attachments A and B" / "Attachments A, B, and C"
  /\bAttachments\s+([A-Z]{1,3}(?:-\d+)?|\d{1,4})(?:\s*(?:,|and|&)\s+([A-Z]{1,3}(?:-\d+)?|\d{1,4}))+\b/gi,
]

/**
 * Pin-cite trailer: `at 12`, `at p. 3`, `at pp. 10-12`, `at page 5`, `, at 14`.
 * Captures the first page number only. Bates strings ("at VTX-000342") don't
 * match because the lookahead requires a leading digit.
 */
const PIN_CITE_PATTERN = /^\s*[,;]?\s*at\s+(?:pp?\.?\s*|pages?\s+)?(\d{1,4})(?:[-\u2013]\d{1,4})?\b/i

let idCounter = 0

function makeId(): string {
  return `cit-${++idCounter}`
}

/** Reset ID counter (useful for tests) */
export function resetIdCounter(): void {
  idCounter = 0
}

/** Generate a stable ID for a citation added manually from the preview UI. */
export function makeManualCitationId(): string {
  return `cit-manual-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

/** Normalize an exhibit label for matching: uppercase, trim whitespace */
export function normalizeLabel(raw: string): string {
  return raw.replace(/["']/g, '').trim().toUpperCase()
}

/**
 * Parse extracted page texts and find all exhibit citations.
 */
export function parseCitations(pages: PageText[]): BriefParseResult {
  const fullText = pages.map(p => p.text).join('')
  const citations: Citation[] = []
  const seen = new Set<string>() // dedup by startIndex

  for (const pattern of CITATION_PATTERNS) {
    // Reset lastIndex for global regex
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null

    while ((match = regex.exec(fullText)) !== null) {
      const startIndex = match.index
      const endIndex = startIndex + match[0].length
      const key = `${startIndex}-${endIndex}`

      if (seen.has(key)) continue
      seen.add(key)

      // Determine which page this citation is on
      const pageNumber = getPageForOffset(pages, startIndex)

      // The primary captured label
      const label = normalizeLabel(match[1])

      citations.push({
        id: makeId(),
        text: match[0],
        normalizedLabel: label,
        startIndex,
        endIndex,
        pageNumber,
        pinCitePage: extractPinCite(fullText, endIndex),
      })

      // For compound matches (Exhibits A, B, and C), also capture secondary labels
      if (match[2]) {
        // Re-parse the full match text for additional labels
        const compoundText = match[0]
        const labelRegex = /(?:,|and|&)\s*([A-Z]{1,3}(?:-\d+)?|\d{1,4})/gi
        let labelMatch: RegExpExecArray | null
        while ((labelMatch = labelRegex.exec(compoundText)) !== null) {
          const secLabel = normalizeLabel(labelMatch[1])
          // These share the same text span but reference different exhibits
          citations.push({
            id: makeId(),
            text: labelMatch[0].trim(),
            normalizedLabel: secLabel,
            startIndex: startIndex + labelMatch.index,
            endIndex: startIndex + labelMatch.index + labelMatch[0].length,
            pageNumber,
          })
        }
      }
    }
  }

  // Sort by position in document
  citations.sort((a, b) => a.startIndex - b.startIndex)

  return { pages, citations, fullText }
}

/** Look at the text immediately after a citation for a pin-cite page number. */
export function extractPinCite(fullText: string, endIndex: number): number | undefined {
  const lookahead = fullText.slice(endIndex, Math.min(fullText.length, endIndex + 40))
  const m = lookahead.match(PIN_CITE_PATTERN)
  if (!m) return undefined
  const page = parseInt(m[1], 10)
  return Number.isFinite(page) && page > 0 ? page : undefined
}

/** Find the page number for a given character offset */
function getPageForOffset(pages: PageText[], offset: number): number {
  for (let i = pages.length - 1; i >= 0; i--) {
    if (offset >= pages[i].startOffset) return pages[i].pageNumber
  }
  return 1
}

/** Page number helper exposed for callers that need it (e.g. manually-added citations). */
export function pageNumberForOffset(pages: PageText[], offset: number): number {
  return getPageForOffset(pages, offset)
}

/**
 * Heuristic: a brief with almost no extracted text per page is likely a
 * Print-to-PDF flattened file or a scanned image without an OCR layer.
 */
export function isLikelyFlattened(pages: PageText[]): boolean {
  if (pages.length === 0) return true
  const totalChars = pages.reduce((sum, p) => sum + p.text.trim().length, 0)
  return totalChars / pages.length < 50
}

/**
 * Auto-map citations to exhibits by matching normalized labels.
 * Returns the number of citations that were successfully mapped.
 */
export function autoMapCitations(
  citations: Citation[],
  exhibitLabels: Map<string, string> // normalizedLabel -> exhibitId
): number {
  let mapped = 0
  for (const cit of citations) {
    const exhibitId = exhibitLabels.get(cit.normalizedLabel)
    if (exhibitId) {
      cit.exhibitId = exhibitId
      mapped++
    }
  }
  return mapped
}
