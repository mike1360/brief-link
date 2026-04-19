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
  const paragraphs = rawText.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean)

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

export function isDocx(file: File): boolean {
  return /\.docx?$/i.test(file.name) ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword'
}
