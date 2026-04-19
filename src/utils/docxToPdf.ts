import mammoth from 'mammoth'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/**
 * Convert a DOCX brief to a PDF so the normal linking pipeline can run.
 *
 * This is deliberately a text-only render — we use mammoth's raw-text
 * extraction and typeset it onto pdf-lib pages with basic word wrapping
 * and pagination. Formatting (fonts, tables, images, footnotes, headers)
 * is lost. For a draft workflow where the paralegal wants to verify
 * exhibit coverage before exporting, that tradeoff is acceptable.
 */
export async function docxToPdf(docx: File): Promise<File> {
  const buf = await docx.arrayBuffer()
  const { value: rawText } = await mammoth.extractRawText({ arrayBuffer: buf })

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.TimesRoman)
  const fontSize = 11
  const lineHeight = fontSize * 1.35
  const margin = 72 // 1 inch

  const pageSize: [number, number] = [612, 792] // US Letter
  const [pageWidth, pageHeight] = pageSize
  const textWidth = pageWidth - margin * 2

  let page = pdf.addPage(pageSize)
  let y = pageHeight - margin

  function newPage() {
    page = pdf.addPage(pageSize)
    y = pageHeight - margin
  }

  // Split paragraphs on blank lines so paragraph breaks show up as gaps.
  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map(p => sanitizeForWinAnsi(p.replace(/\s+/g, ' ').trim()))
    .filter(Boolean)

  for (const para of paragraphs) {
    const lines = wrapText(para, font, fontSize, textWidth)
    for (const line of lines) {
      if (y < margin + lineHeight) newPage()
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      })
      y -= lineHeight
    }
    // Paragraph gap
    y -= lineHeight * 0.5
  }

  const bytes = await pdf.save()
  const outName = docx.name.replace(/\.docx?$/i, '') + '.pdf'
  return new File([bytes], outName, { type: 'application/pdf' })
}

/** Greedy word-wrap using pdf-lib's widthOfTextAtSize. */
function wrapText(
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? current + ' ' + word : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      // Hard-break a single word longer than the line.
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let remaining = word
        while (font.widthOfTextAtSize(remaining, size) > maxWidth) {
          let cut = remaining.length
          while (cut > 0 && font.widthOfTextAtSize(remaining.slice(0, cut), size) > maxWidth) cut--
          if (cut <= 0) break
          lines.push(remaining.slice(0, cut))
          remaining = remaining.slice(cut)
        }
        current = remaining
      } else {
        current = word
      }
    }
  }
  if (current) lines.push(current)
  return lines
}

/**
 * pdf-lib's StandardFonts use WinAnsi encoding, which can't represent
 * em/en dashes, smart quotes, ellipsis, NBSP, etc. We map the common
 * cases to ASCII equivalents and strip anything else outside Latin-1
 * so DOCX text containing typographic punctuation doesn't blow up the
 * conversion.
 */
function sanitizeForWinAnsi(s: string): string {
  return s
    .replace(/[\u2014]/g, '--')   // em dash
    .replace(/[\u2013]/g, '-')    // en dash
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // single curly quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // double curly quotes
    .replace(/[\u2026]/g, '...')  // ellipsis
    .replace(/[\u00A0]/g, ' ')    // non-breaking space
    .replace(/[\u2022\u00B7]/g, '-') // bullets
    .replace(/[\u00AD]/g, '')     // soft hyphen
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/[\u2500-\u257F]/g, '-') // box-drawing chars (e.g. 0x2500)
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, '') // strip remaining non-WinAnsi
}

export function isDocx(file: File): boolean {
  return /\.docx?$/i.test(file.name) ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword'
}
