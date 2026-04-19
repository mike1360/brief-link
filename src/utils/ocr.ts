import * as pdfjsLib from 'pdfjs-dist'
import type { PageText, TextItem } from './types'

/**
 * Run OCR (Tesseract.js) over a scanned or flattened PDF and return a
 * PageText[] compatible with the rest of the pipeline. Tesseract is
 * dynamically imported so the ~10MB wasm + language model only download
 * when a user actually opts into OCR.
 *
 * Coordinates: we render at 2x scale for OCR quality, then convert word
 * bboxes from canvas pixels (top-left origin) back to PDF points
 * (bottom-left origin) so link annotations land in the right place.
 */
export async function ocrPdf(
  file: File,
  onProgress?: (current: number, total: number, phase: string) => void,
): Promise<PageText[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  onProgress?.(0, pdf.numPages, 'Loading OCR engine…')
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')

  const pages: PageText[] = []
  let globalOffset = 0
  const scale = 2

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(i, pdf.numPages, `OCR page ${i}/${pdf.numPages}`)

      const page = await pdf.getPage(i)
      const viewportPts = page.getViewport({ scale: 1 }) // page size in PDF points
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not create canvas context for OCR')

      // pdf.js renders the page image that Tesseract reads.
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise

      // Tesseract.js v6 typed `data` as Page which hides `words`. We ask
      // for full output blocks, then read word bboxes off the result as any.
      const recog = await worker.recognize(canvas, {}, { blocks: true })
      const data = recog.data as any

      const items: TextItem[] = []
      const pageHeight = viewportPts.height

      const words: any[] = data.words || data.blocks?.flatMap((b: any) =>
        b.paragraphs?.flatMap((p: any) => p.lines?.flatMap((l: any) => l.words || [])) || []
      ) || []
      for (const word of words) {
        const str = word.text?.trim()
        if (!str) continue
        const { x0, y0, x1, y1 } = word.bbox
        const xPt = x0 / scale
        const widthPt = (x1 - x0) / scale
        const heightPt = (y1 - y0) / scale
        const yTopPt = y0 / scale
        // Flip Y from top-left (canvas) to bottom-left (PDF)
        const yPt = pageHeight - yTopPt - heightPt
        items.push({
          str,
          x: xPt,
          y: yPt,
          width: widthPt,
          height: heightPt,
          pageNumber: i,
        })
      }

      const text = (data.text || '').replace(/\s+/g, ' ').trim() + '\n'
      pages.push({
        pageNumber: i,
        text,
        startOffset: globalOffset,
        items,
      })
      globalOffset += text.length

      canvas.width = 0
      canvas.height = 0
    }
  } finally {
    await worker.terminate()
  }

  return pages
}
