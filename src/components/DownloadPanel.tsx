import { Download, FileText, CheckCircle2, BookOpen } from 'lucide-react'
import { useCallback } from 'react'
import type { Citation, ExhibitFile } from '../utils/types'

interface Props {
  linkedPdfUrl: string | null
  citations: Citation[]
  exhibits: ExhibitFile[]
  briefFileName: string
}

export default function DownloadPanel({ linkedPdfUrl, citations, exhibits, briefFileName }: Props) {
  const linkedCount = citations.filter(c => c.exhibitId).length
  const exhibitCount = new Set(
    citations.filter(c => c.exhibitId).map(c => c.exhibitId)
  ).size

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
          {linkedCount} citation{linkedCount !== 1 ? 's' : ''} linked to {exhibitCount} exhibit{exhibitCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-3">
        {linkedPdfUrl ? (
          <button onClick={handleDownloadPdf} className="btn-primary w-full">
            <Download size={18} />
            Download Linked PDF
          </button>
        ) : (
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-card2)' }}>
            <p className="text-sm text-th2">PDF generation failed. Please try again.</p>
          </div>
        )}

        <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: 'var(--bg-card2)' }}>
          <div className="flex items-start gap-2">
            <BookOpen size={14} className="text-th3 mt-0.5 shrink-0" />
            <div className="text-[11px] text-th3 space-y-1">
              <p>The PDF contains:</p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li>Your original brief with clickable exhibit links</li>
                <li>An exhibit index page with page numbers</li>
                <li>All {exhibitCount} exhibit{exhibitCount !== 1 ? 's' : ''} appended as pages</li>
                <li>Bookmarks panel for quick navigation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
