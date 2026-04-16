import { Download, FileText, Globe, Copy, CheckCircle2 } from 'lucide-react'
import { useState, useCallback } from 'react'
import type { Citation, ExhibitFile } from '../utils/types'
import { buildLinkedHtml } from '../utils/pdfProcessor'

interface Props {
  linkedPdfUrl: string | null
  fullText: string
  citations: Citation[]
  exhibits: ExhibitFile[]
  briefFileName: string
}

export default function DownloadPanel({ linkedPdfUrl, fullText, citations, exhibits, briefFileName }: Props) {
  const [copied, setCopied] = useState(false)

  const exhibitMap = new Map(exhibits.map(e => [e.id, e]))
  const linkedCount = citations.filter(c => c.exhibitId).length

  const handleDownloadHtml = useCallback(() => {
    const html = buildLinkedHtml(fullText, citations, exhibitMap)
    const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${briefFileName} — Linked Brief</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.8; color: #1a1a1a; }
    .citation-link { color: #1A4A73; text-decoration: underline; text-underline-offset: 2px; }
    .citation-link:hover { color: #205A8A; }
    h1 { font-size: 14px; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>${briefFileName} — ${linkedCount} exhibit links embedded by Veritext Brief Link</h1>
  <div style="white-space: pre-wrap;">${html}</div>
</body>
</html>`

    const blob = new Blob([htmlDoc], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = briefFileName.replace(/\.pdf$/i, '') + '_linked.html'
    a.click()
    URL.revokeObjectURL(url)
  }, [fullText, citations, exhibits, briefFileName])

  const handleDownloadPdf = useCallback(() => {
    if (!linkedPdfUrl) return
    const a = document.createElement('a')
    a.href = linkedPdfUrl
    a.download = briefFileName.replace(/\.pdf$/i, '') + '_linked.pdf'
    a.click()
  }, [linkedPdfUrl, briefFileName])

  return (
    <div className="card p-6">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3"
             style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)' }}>
          <CheckCircle2 size={28} style={{ color: 'var(--success)' }} />
        </div>
        <h3 className="text-lg font-semibold text-th">Brief Linked Successfully</h3>
        <p className="text-sm text-th3 mt-1">
          {linkedCount} exhibit {linkedCount === 1 ? 'citation' : 'citations'} linked across your brief
        </p>
      </div>

      <div className="space-y-3">
        <button onClick={handleDownloadHtml} className="btn-primary w-full">
          <Globe size={18} />
          Download as HTML (Recommended)
        </button>

        {linkedPdfUrl && (
          <button onClick={handleDownloadPdf} className="btn-secondary w-full">
            <FileText size={18} />
            Download as PDF
          </button>
        )}

        <p className="text-[10px] text-th3 text-center">
          HTML format preserves clickable links in all browsers and email clients.
          PDF links require a PDF viewer that supports URI annotations.
        </p>
      </div>
    </div>
  )
}
