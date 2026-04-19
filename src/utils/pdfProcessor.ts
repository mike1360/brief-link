import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFName, PDFArray, PDFDict, PDFString, PDFNumber } from 'pdf-lib'
import type { PageText, TextItem, Citation, ExhibitFile, PreservationReport } from './types'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/**
 * Extract text content from a PDF file, page by page.
 * Captures position data for each text item so we can place link annotations accurately.
 */
export async function extractTextFromPdf(file: File): Promise<PageText[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: PageText[] = []
  let globalOffset = 0

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1.0 })

    const items: TextItem[] = []
    const textParts: string[] = []

    for (const item of content.items as any[]) {
      if (!item.str) continue

      // pdf.js transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const tx = item.transform[4]
      const ty = item.transform[5]
      const fontSize = Math.abs(item.transform[3]) || Math.abs(item.transform[0])

      items.push({
        str: item.str,
        x: tx,
        // pdf.js Y is from bottom-left (same as PDF coordinate space)
        y: ty,
        width: item.width,
        height: fontSize,
        pageNumber: i,
      })
      textParts.push(item.str)
    }

    const text = textParts.join(' ').replace(/\s+/g, ' ') + '\n'

    pages.push({
      pageNumber: i,
      text,
      startOffset: globalOffset,
      items,
    })
    globalOffset += text.length
  }

  return pages
}

/**
 * Find the PDF-coordinate bounding box for a citation on a given page.
 *
 * Two-pass strategy:
 *   1) Try to locate the citation fully inside a single text item, narrowing the
 *      rect to the substring's approximate x-range using per-character width.
 *      pdf.js often returns an entire line or paragraph as one item, so without
 *      this narrowing the link would cover the whole block of text.
 *   2) If not found within any single item, fall back to a multi-item span.
 *
 * `occurrenceIndex` selects the Nth match of the citation text on the page so
 * repeated labels (e.g. "Ex. 5" appearing twice) link to distinct positions.
 */
function findCitationRect(
  citation: Citation,
  page: PageText,
  occurrenceIndex: number = 0,
): { x: number; y: number; width: number; height: number } | null {
  const target = citation.text.toLowerCase()
  const items = page.items

  // Pass 1: substring inside a single item
  let occurrencesSeen = 0
  for (const item of items) {
    const itemText = item.str.toLowerCase()
    let searchStart = 0
    let idx = itemText.indexOf(target, searchStart)
    while (idx !== -1) {
      if (occurrencesSeen === occurrenceIndex) {
        const charWidth = item.str.length > 0 ? item.width / item.str.length : 0
        const x = item.x + idx * charWidth
        const width = target.length * charWidth
        return {
          x: x - 1,
          y: item.y - 2,
          width: width + 2,
          height: item.height + 4,
        }
      }
      occurrencesSeen++
      searchStart = idx + target.length
      idx = itemText.indexOf(target, searchStart)
    }
  }

  // Pass 2: citation spans multiple items — walk running text and narrow via char widths
  let runningText = ''
  let spanOccurrences = 0
  for (let i = 0; i < items.length; i++) {
    runningText += items[i].str + ' '
    const searchText = runningText.toLowerCase()

    let from = 0
    let idx = searchText.indexOf(target, from)
    while (idx !== -1) {
      // Only count matches that end within this newly-appended item, to avoid
      // re-counting the same span across iterations.
      const matchEnd = idx + target.length
      const itemStartInRunning = runningText.length - items[i].str.length - 1
      if (matchEnd > itemStartInRunning) {
        if (spanOccurrences === occurrenceIndex) {
          // Find start and end items by char offset
          let charCount = 0
          let startItemIdx = 0
          let startCharInItem = 0
          for (let j = 0; j < items.length; j++) {
            const itemEnd = charCount + items[j].str.length + 1
            if (charCount <= idx && idx < itemEnd) {
              startItemIdx = j
              startCharInItem = idx - charCount
              break
            }
            charCount += items[j].str.length + 1
          }

          const startItem = items[startItemIdx]
          const endItem = items[i]
          const startCharWidth =
            startItem.str.length > 0 ? startItem.width / startItem.str.length : 0
          const startX = startItem.x + startCharInItem * startCharWidth

          // Same-line span: narrow horizontally; cross-line: fall back to start item only
          const sameLine = Math.abs(startItem.y - endItem.y) < 2
          if (sameLine) {
            const endCharCount = (() => {
              let c = 0
              for (let j = 0; j < startItemIdx; j++) c += items[j].str.length + 1
              return c
            })()
            const relEnd = matchEnd - endCharCount
            const endCharWidth =
              endItem.str.length > 0 ? endItem.width / endItem.str.length : 0
            // Use startItem width as approximation if match is fully within the start item
            const right = startItem.x + relEnd * startCharWidth
            const endRight = endItem.x + Math.min(relEnd, endItem.str.length) * endCharWidth
            const finalRight = Math.max(right, endRight, startX + 10)
            return {
              x: startX - 1,
              y: Math.min(startItem.y, endItem.y) - 2,
              width: finalRight - startX + 2,
              height: Math.max(startItem.height, endItem.height) + 4,
            }
          } else {
            // Cross-line fallback: just highlight within start item
            const width = target.length * startCharWidth
            return {
              x: startX - 1,
              y: startItem.y - 2,
              width: width + 2,
              height: startItem.height + 4,
            }
          }
        }
        spanOccurrences++
      }
      from = idx + target.length
      idx = searchText.indexOf(target, from)
    }
  }

  return null
}

/**
 * Build a single self-contained PDF:
 * 1. Original brief pages (with link annotations on citations)
 * 2. Exhibit index page
 * 3. All exhibit pages appended
 *
 * Citations link internally to the exhibit's starting page within this PDF.
 */
export async function buildLinkedPdf(
  originalFile: File,
  citations: Citation[],
  exhibits: Map<string, ExhibitFile>,
  pages: PageText[],
): Promise<Uint8Array> {
  const originalBytes = await originalFile.arrayBuffer()
  const pdfDoc = await PDFDocument.load(originalBytes)
  const briefPageCount = pdfDoc.getPageCount()

  // Determine which exhibits are actually linked by citations.
  // Sealed exhibits are deliberately excluded from the bundle — the citation
  // is still highlighted in output but no link annotation is emitted and the
  // exhibit file is not appended (NY ComDiv / sealed-filing compliance).
  const linkedExhibitIds = new Set(
    citations.filter(c => c.exhibitId).map(c => c.exhibitId!)
  )
  const linkedExhibits = [...exhibits.values()]
    .filter(ex => linkedExhibitIds.has(ex.id) && !ex.sealed)
    .sort((a, b) => a.label.localeCompare(b.label))

  // ── Step 1: Load all exhibit PDFs and figure out page numbers ──

  interface ExhibitEntry {
    exhibit: ExhibitFile
    startPage: number  // 0-indexed page in final doc
    pageCount: number
  }

  const exhibitEntries: ExhibitEntry[] = []
  // Reserve 1 page for exhibit index after the brief
  let currentPage = briefPageCount + 1

  for (const ex of linkedExhibits) {
    const exBytes = await ex.file.arrayBuffer()
    let exPageCount = 1

    try {
      // Try loading as PDF
      const exDoc = await PDFDocument.load(exBytes, { ignoreEncryption: true })
      exPageCount = exDoc.getPageCount()
      const copiedPages = await pdfDoc.copyPages(exDoc, exDoc.getPageIndices())
      for (const copiedPage of copiedPages) {
        pdfDoc.addPage(copiedPage)
      }
    } catch {
      // Not a valid PDF (might be an image) — create a page with the filename
      const page = pdfDoc.addPage()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const { width, height } = page.getSize()

      // Header bar
      page.drawRectangle({
        x: 0, y: height - 50,
        width, height: 50,
        color: rgb(0.12, 0.23, 0.35),
      })
      page.drawText(ex.label, {
        x: width / 2 - boldFont.widthOfTextAtSize(ex.label, 18) / 2,
        y: height - 35,
        size: 18,
        font: boldFont,
        color: rgb(1, 1, 1),
      })

      page.drawText(`File: ${ex.file.name}`, {
        x: 72, y: height - 100,
        size: 12, font,
        color: rgb(0.3, 0.3, 0.3),
      })
      page.drawText(`(Non-PDF file embedded as reference)`, {
        x: 72, y: height - 120,
        size: 10, font,
        color: rgb(0.5, 0.5, 0.5),
      })
      exPageCount = 1
    }

    exhibitEntries.push({
      exhibit: ex,
      startPage: currentPage,
      pageCount: exPageCount,
    })
    currentPage += exPageCount
  }

  // ── Step 2: Create the exhibit index page ──

  const indexPage = pdfDoc.insertPage(briefPageCount)
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const { width: ixW, height: ixH } = indexPage.getSize()

  // Header bar
  indexPage.drawRectangle({
    x: 0, y: ixH - 55,
    width: ixW, height: 55,
    color: rgb(0.12, 0.23, 0.35),
  })
  indexPage.drawText('EXHIBIT INDEX', {
    x: ixW / 2 - boldFont.widthOfTextAtSize('EXHIBIT INDEX', 20) / 2,
    y: ixH - 38,
    size: 20, font: boldFont,
    color: rgb(1, 1, 1),
  })

  let yPos = ixH - 90

  indexPage.drawText('The following exhibits are included in this document:', {
    x: 72, y: yPos,
    size: 11, font,
    color: rgb(0.2, 0.2, 0.2),
  })
  yPos -= 30

  // Table header
  indexPage.drawText('Exhibit', {
    x: 72, y: yPos, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1),
  })
  indexPage.drawText('Page', {
    x: ixW - 108, y: yPos, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1),
  })
  yPos -= 4
  indexPage.drawLine({
    start: { x: 72, y: yPos },
    end: { x: ixW - 72, y: yPos },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
  })
  yPos -= 18

  // Build a map from exhibit ID to the page ref in the final document
  const exhibitPageMap = new Map<string, number>() // exhibitId -> 0-indexed page

  for (const entry of exhibitEntries) {
    const label = entry.exhibit.label
    // Display page number (1-indexed, accounting for inserted index page)
    const displayPageNum = entry.startPage + 1

    indexPage.drawText(label, {
      x: 72, y: yPos, size: 11, font, color: rgb(0.1, 0.29, 0.45),
    })
    indexPage.drawText(String(displayPageNum), {
      x: ixW - 100, y: yPos, size: 11, font, color: rgb(0.3, 0.3, 0.3),
    })

    // Add a clickable link on the index page too
    const indexLinkDict = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [68, yPos - 3, ixW - 72, yPos + 13],
      Border: [0, 0, 0],
      C: [0.1, 0.29, 0.45],
    })
    // We'll set the Dest after we have all page refs
    const indexLinkRef = pdfDoc.context.register(indexLinkDict)
    indexPage.node.addAnnot(indexLinkRef)

    exhibitPageMap.set(entry.exhibit.id, entry.startPage)

    yPos -= 22

    if (yPos < 72) {
      // Would need pagination for many exhibits — skip for now
      break
    }
  }

  // ── Step 3: Set destinations on all link annotations ──

  // Get all pages in final document to reference them
  const allPages = pdfDoc.getPages()

  // Set Dest on exhibit index links
  let indexAnnotIdx = 0
  for (const entry of exhibitEntries) {
    const targetPageIdx = entry.startPage
    if (targetPageIdx >= allPages.length) continue

    const targetPageRef = allPages[targetPageIdx].ref
    const annots = indexPage.node.Annots()
    if (annots && indexAnnotIdx < annots.size()) {
      const annotRef = annots.get(indexAnnotIdx)
      const annotDict = pdfDoc.context.lookup(annotRef) as PDFDict
      annotDict.set(
        PDFName.of('Dest'),
        pdfDoc.context.obj([targetPageRef, 'Fit'])
      )
      indexAnnotIdx++
    }
  }

  // ── Step 4: Add link annotations on brief pages for each citation ──

  const briefPages = allPages.slice(0, briefPageCount)

  // Compute per-page occurrence index for each citation so repeated citation
  // text (e.g. "Ex. 5" twice on the same page) maps to distinct positions.
  const sortedCitations = [...citations].sort((a, b) => a.startIndex - b.startIndex)
  const occurrenceByCitation = new Map<string, number>()
  const perPageCounters = new Map<string, number>()
  for (const cit of sortedCitations) {
    const key = `${cit.pageNumber}::${cit.text.toLowerCase()}`
    const next = perPageCounters.get(key) ?? 0
    occurrenceByCitation.set(cit.id, next)
    perPageCounters.set(key, next + 1)
  }

  for (const cit of citations) {
    if (!cit.exhibitId) continue
    const exhibit = exhibits.get(cit.exhibitId)
    if (!exhibit) continue

    const pageIdx = cit.pageNumber - 1
    if (pageIdx >= briefPages.length) continue

    const briefPage = briefPages[pageIdx]
    const pageData = pages.find(p => p.pageNumber === cit.pageNumber)
    if (!pageData) continue

    const occurrenceIdx = occurrenceByCitation.get(cit.id) ?? 0
    const rect = findCitationRect(cit, pageData, occurrenceIdx)
    const { height: pageHeight } = briefPage.getSize()

    let linkRect: [number, number, number, number]

    if (rect) {
      linkRect = [
        rect.x,
        rect.y,
        rect.x + rect.width,
        rect.y + rect.height,
      ]
    } else {
      const localOffset = cit.startIndex - pageData.startOffset
      const fraction = pageData.text.length > 0 ? localOffset / pageData.text.length : 0
      const estY = pageHeight - (fraction * (pageHeight - 100)) - 50
      const estWidth = Math.min(cit.text.length * 5.5, 300)
      linkRect = [70, estY - 8, 70 + estWidth, estY + 8]
    }

    // Sealed exhibit: highlight the citation but emit no outbound link.
    if (exhibit.sealed) {
      if (rect) {
        briefPage.drawRectangle({
          x: rect.x,
          y: rect.y - 1,
          width: rect.width,
          height: 0.75,
          color: rgb(0.85, 0.47, 0.02), // warning / amber to signal sealed
          opacity: 0.7,
        })
      }
      continue
    }

    const exhibitStart = exhibitPageMap.get(cit.exhibitId)
    if (exhibitStart === undefined) continue

    // Pin-cite deep link: `Ex. B at 12` → page 12 inside exhibit B.
    // Clamped so a bad page ref can't point past the exhibit.
    const exhibitPageCount = exhibitEntries.find(e => e.exhibit.id === cit.exhibitId)?.pageCount ?? 1
    let targetPageIdx = exhibitStart
    if (cit.pinCitePage && cit.pinCitePage > 1) {
      const offset = Math.min(cit.pinCitePage - 1, exhibitPageCount - 1)
      targetPageIdx = exhibitStart + offset
    }
    if (targetPageIdx >= allPages.length) continue

    const targetPageRef = allPages[targetPageIdx].ref

    const linkDict = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: linkRect,
      Border: [0, 0, 0],
      C: [0.1, 0.29, 0.45],
      Dest: [targetPageRef, 'Fit'],
    })
    const linkRef = pdfDoc.context.register(linkDict)
    briefPage.node.addAnnot(linkRef)

    if (rect) {
      briefPage.drawRectangle({
        x: rect.x,
        y: rect.y - 1,
        width: rect.width,
        height: 0.75,
        color: rgb(0.1, 0.29, 0.45),
        opacity: 0.6,
      })
    }
  }

  // ── Step 5: Add outline / bookmarks ──

  try {
    // Create the outline dictionary
    const outlineItems: { title: string; pageRef: any }[] = []

    // Brief bookmark
    if (briefPages.length > 0) {
      outlineItems.push({ title: 'Brief', pageRef: briefPages[0].ref })
    }

    // Exhibit index bookmark
    outlineItems.push({ title: 'Exhibit Index', pageRef: allPages[briefPageCount].ref })

    // Individual exhibit bookmarks
    for (const entry of exhibitEntries) {
      if (entry.startPage < allPages.length) {
        outlineItems.push({
          title: entry.exhibit.label,
          pageRef: allPages[entry.startPage].ref,
        })
      }
    }

    // Build PDF outline tree
    if (outlineItems.length > 0) {
      const outlineRefs: any[] = []

      for (const item of outlineItems) {
        const outlineDict = pdfDoc.context.obj({
          Title: PDFString.of(item.title),
          Dest: [item.pageRef, 'Fit'],
        })
        outlineRefs.push(pdfDoc.context.register(outlineDict))
      }

      // Link items in a doubly-linked list
      for (let i = 0; i < outlineRefs.length; i++) {
        const dict = pdfDoc.context.lookup(outlineRefs[i]) as PDFDict
        if (i > 0) dict.set(PDFName.of('Prev'), outlineRefs[i - 1])
        if (i < outlineRefs.length - 1) dict.set(PDFName.of('Next'), outlineRefs[i + 1])
      }

      // Create root outline
      const outlineRoot = pdfDoc.context.obj({
        Type: 'Outlines',
        First: outlineRefs[0],
        Last: outlineRefs[outlineRefs.length - 1],
        Count: PDFNumber.of(outlineRefs.length),
      })
      const outlineRootRef = pdfDoc.context.register(outlineRoot)

      // Set parent on all items
      for (const ref of outlineRefs) {
        const dict = pdfDoc.context.lookup(ref) as PDFDict
        dict.set(PDFName.of('Parent'), outlineRootRef)
      }

      // Attach outline to document catalog
      pdfDoc.catalog.set(PDFName.of('Outlines'), outlineRootRef)
      pdfDoc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'))
    }
  } catch {
    // Bookmarks are nice-to-have, don't fail the whole build
  }

  return pdfDoc.save()
}

/**
 * Verify that every detected citation's text still appears in the generated
 * PDF's brief pages. Required by FR-8: the output must preserve the original
 * citation text string — hyperlinks are an overlay, not a replacement.
 *
 * Loads the output bytes back through pdf.js, extracts text from only the
 * first `briefPageCount` pages (exhibit pages are ignored), normalizes
 * whitespace, and verifies each citation substring is present.
 */
export async function verifyCitationPreservation(
  pdfBytes: Uint8Array,
  citations: Citation[],
  briefPageCount: number,
): Promise<PreservationReport> {
  // pdf.js consumes the buffer, so pass a copy to keep pdfBytes usable afterward.
  const buf = pdfBytes.slice().buffer
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const limit = Math.min(briefPageCount, pdf.numPages)

  let extracted = ''
  for (let i = 1; i <= limit; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    for (const item of content.items as any[]) {
      if (item.str) extracted += item.str + ' '
    }
  }

  const normalize = (s: string) => s.replace(/\s+/g, ' ').toLowerCase()
  const haystack = normalize(extracted)

  const missing: PreservationReport['missing'] = []
  for (const cit of citations) {
    if (!haystack.includes(normalize(cit.text))) {
      missing.push({ id: cit.id, text: cit.text, pageNumber: cit.pageNumber })
    }
  }

  return {
    preserved: missing.length === 0,
    totalChecked: citations.length,
    missing,
  }
}
