import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, rgb } from 'pdf-lib'
import type { PageText, Citation, ExhibitFile } from './types'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/**
 * Extract text content from a PDF file, page by page.
 */
export async function extractTextFromPdf(file: File): Promise<PageText[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: PageText[] = []
  let globalOffset = 0

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item: any) => item.str)
      .join(' ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      + '\n'

    pages.push({
      pageNumber: i,
      text,
      startOffset: globalOffset,
    })
    globalOffset += text.length
  }

  return pages
}

/**
 * Build a linked PDF: copies the original and adds link annotations
 * at each citation location pointing to the exhibit files.
 *
 * For the POC, citations link to exhibit object URLs.
 * In production, these would link to hosted exhibit URLs or embedded file attachments.
 */
export async function buildLinkedPdf(
  originalFile: File,
  citations: Citation[],
  exhibits: Map<string, ExhibitFile>,
  pages: PageText[],
): Promise<Uint8Array> {
  const originalBytes = await originalFile.arrayBuffer()
  const pdfDoc = await PDFDocument.load(originalBytes)
  const pdfPages = pdfDoc.getPages()

  // Group citations by page
  const citationsByPage = new Map<number, Citation[]>()
  for (const cit of citations) {
    if (!cit.exhibitId) continue
    const exhibit = exhibits.get(cit.exhibitId)
    if (!exhibit) continue

    const existing = citationsByPage.get(cit.pageNumber) || []
    existing.push(cit)
    citationsByPage.set(cit.pageNumber, existing)
  }

  // For each page with citations, add link annotations
  for (const [pageNum, pageCitations] of citationsByPage) {
    const pageIndex = pageNum - 1
    if (pageIndex >= pdfPages.length) continue

    const pdfPage = pdfPages[pageIndex]
    const { width, height } = pdfPage.getSize()
    const pageText = pages.find(p => p.pageNumber === pageNum)
    if (!pageText) continue

    for (const cit of pageCitations) {
      const exhibit = exhibits.get(cit.exhibitId!)!

      // Estimate position of citation text on the page
      // This is approximate — for production we'd use text position data from pdf.js
      const localOffset = cit.startIndex - pageText.startOffset
      const totalChars = pageText.text.length
      const fractionThrough = totalChars > 0 ? localOffset / totalChars : 0

      // Approximate Y position (top to bottom maps to high Y to low Y in PDF coords)
      const estimatedY = height - (fractionThrough * height)
      const linkHeight = 14
      const linkWidth = Math.min(cit.text.length * 7, width - 72)

      // Add a URI link annotation
      const annotDict = pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [36, estimatedY - linkHeight, 36 + linkWidth, estimatedY],
        Border: [0, 0, 0],
        C: [0.09, 0.29, 0.45], // Veritext blue
        A: {
          Type: 'Action',
          S: 'URI',
          URI: exhibit.url,
        },
      })
      const annotRef = pdfDoc.context.register(annotDict)
      pdfPage.node.addAnnot(annotRef)

      // Add a subtle underline to indicate the link
      pdfPage.drawRectangle({
        x: 36,
        y: estimatedY - linkHeight - 1,
        width: linkWidth,
        height: 1,
        color: rgb(0.1, 0.29, 0.45),
        opacity: 0.5,
      })
    }
  }

  return pdfDoc.save()
}

/**
 * Simpler approach: generate an HTML version of the brief with embedded hyperlinks.
 * This is more reliable for the POC than trying to position links in the PDF.
 */
export function buildLinkedHtml(
  fullText: string,
  citations: Citation[],
  exhibits: Map<string, ExhibitFile>,
): string {
  // Sort citations by startIndex descending so we can insert without shifting offsets
  const sorted = [...citations]
    .filter(c => c.exhibitId)
    .sort((a, b) => b.startIndex - a.startIndex)

  let html = escapeHtml(fullText)

  // We need to map original offsets to escaped offsets
  // Simpler approach: work on the original text, then escape segments
  let result = fullText
  for (const cit of sorted) {
    const exhibit = exhibits.get(cit.exhibitId!)
    if (!exhibit) continue

    const before = result.slice(0, cit.startIndex)
    const citText = result.slice(cit.startIndex, cit.endIndex)
    const after = result.slice(cit.endIndex)

    result = before +
      `<a href="${escapeHtml(exhibit.url)}" class="citation-link" target="_blank" title="Open ${escapeHtml(exhibit.label)}">${escapeHtml(citText)}</a>` +
      after
  }

  // Escape the non-link portions
  // Actually we need a different approach — let's build it segment by segment
  return buildSegmentedHtml(fullText, citations, exhibits)
}

function buildSegmentedHtml(
  fullText: string,
  citations: Citation[],
  exhibits: Map<string, ExhibitFile>,
): string {
  const linked = citations
    .filter(c => c.exhibitId && exhibits.has(c.exhibitId))
    .sort((a, b) => a.startIndex - b.startIndex)

  const parts: string[] = []
  let cursor = 0

  for (const cit of linked) {
    // Text before this citation
    if (cit.startIndex > cursor) {
      parts.push(escapeHtml(fullText.slice(cursor, cit.startIndex)))
    }

    const exhibit = exhibits.get(cit.exhibitId!)!
    const citText = fullText.slice(cit.startIndex, cit.endIndex)
    parts.push(
      `<a href="${escapeHtml(exhibit.url)}" class="citation-link" target="_blank" title="Open ${escapeHtml(exhibit.label)}">${escapeHtml(citText)}</a>`
    )
    cursor = cit.endIndex
  }

  // Remaining text
  if (cursor < fullText.length) {
    parts.push(escapeHtml(fullText.slice(cursor)))
  }

  return parts.join('')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
