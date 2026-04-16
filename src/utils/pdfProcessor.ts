import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFName, PDFArray, PDFDict, PDFString, PDFNumber } from 'pdf-lib'
import type { PageText, TextItem, Citation, ExhibitFile } from './types'

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
 * Searches through text items to find the ones that contain the citation text.
 */
function findCitationRect(
  citation: Citation,
  page: PageText,
): { x: number; y: number; width: number; height: number } | null {
  const target = citation.text.toLowerCase()
  const items = page.items

  // Build a running text from items to find where the citation falls
  let runningText = ''
  for (let i = 0; i < items.length; i++) {
    const prevLen = runningText.length
    runningText += items[i].str + ' '

    const searchText = runningText.toLowerCase()
    const idx = searchText.indexOf(target)

    if (idx !== -1) {
      // Found the citation — figure out which items span it
      // Walk backward to find the starting item
      let charCount = 0
      let startItemIdx = i
      for (let j = 0; j <= i; j++) {
        const itemEnd = charCount + items[j].str.length + 1 // +1 for space
        if (charCount <= idx && idx < itemEnd) {
          startItemIdx = j
          break
        }
        charCount += items[j].str.length + 1
      }

      const startItem = items[startItemIdx]
      const endItem = items[i]

      // Bounding box spanning from start item to end item
      const x = Math.min(startItem.x, endItem.x)
      const y = Math.min(startItem.y, endItem.y)
      const right = Math.max(startItem.x + startItem.width, endItem.x + endItem.width)
      const height = Math.max(startItem.height, endItem.height)

      return {
        x: x - 1,
        y: y - 2,
        width: right - x + 2,
        height: height + 4,
      }
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

  // Determine which exhibits are actually linked by citations
  const linkedExhibitIds = new Set(
    citations.filter(c => c.exhibitId).map(c => c.exhibitId!)
  )
  const linkedExhibits = [...exhibits.values()]
    .filter(ex => linkedExhibitIds.has(ex.id))
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

  for (const cit of citations) {
    if (!cit.exhibitId) continue
    const targetPageIdx = exhibitPageMap.get(cit.exhibitId)
    if (targetPageIdx === undefined) continue
    if (targetPageIdx >= allPages.length) continue

    const pageIdx = cit.pageNumber - 1
    if (pageIdx >= briefPages.length) continue

    const briefPage = briefPages[pageIdx]
    const pageData = pages.find(p => p.pageNumber === cit.pageNumber)
    if (!pageData) continue

    const targetPageRef = allPages[targetPageIdx].ref

    // Try to find exact position from text items
    const rect = findCitationRect(cit, pageData)
    const { height: pageHeight } = briefPage.getSize()

    let linkRect: [number, number, number, number]

    if (rect) {
      // Use actual text position
      linkRect = [
        rect.x,
        rect.y,
        rect.x + rect.width,
        rect.y + rect.height,
      ]
    } else {
      // Fallback: estimate position
      const localOffset = cit.startIndex - pageData.startOffset
      const fraction = pageData.text.length > 0 ? localOffset / pageData.text.length : 0
      const estY = pageHeight - (fraction * (pageHeight - 100)) - 50
      const estWidth = Math.min(cit.text.length * 5.5, 300)
      linkRect = [70, estY - 8, 70 + estWidth, estY + 8]
    }

    // Create link annotation with GoTo destination (internal page link)
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

    // Draw a subtle blue underline at the citation location
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
