import { Download, CheckCircle2, BookOpen, ShieldCheck, AlertTriangle, Lock } from 'lucide-react'
import { useCallback } from 'react'
import type { Citation, ExhibitFile, PreservationReport } from '../utils/types'

interface Props {
  linkedPdfUrl: string | null
  citations: Citation[]
  exhibits: ExhibitFile[]
  briefFileName: string
  preservation: PreservationReport | null
}

export default function DownloadPanel({ linkedPdfUrl, citations, exhibits, briefFileName, preservation }: Props) {
  const linkedCitations = citations.filter(c => c.exhibitId)
  const sealedCount = linkedCitations.filter(c => exhibits.find(e => e.id === c.exhibitId)?.sealed).length
  const liveLinkCount = linkedCitations.length - sealedCount
  const bundledExhibitIds = new Set(
    linkedCitations
      .map(c => exhibits.find(e => e.id === c.exhibitId))
      .filter((e): e is ExhibitFile => !!e && !e.sealed)
      .map(e => e.id),
  )

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
          {liveLinkCount} live link{liveLinkCount !== 1 ? 's' : ''} to {bundledExhibitIds.size} exhibit{bundledExhibitIds.size !== 1 ? 's' : ''}
          {sealedCount > 0 && ` • ${sealedCount} sealed (highlighted, no link)`}
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

        {/* Preservation report */}
        {preservation && (
          <div
            className="rounded-lg p-3 flex items-start gap-2 border-l-4"
            style={{
              backgroundColor: 'var(--bg-card2)',
              borderLeftColor: preservation.preserved ? 'var(--success)' : 'var(--warning)',
            }}
          >
            {preservation.preserved ? (
              <ShieldCheck size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
            ) : (
              <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            )}
            <div className="text-[11px] text-th2">
              {preservation.preserved ? (
                <p>
                  <span className="font-medium text-th">Citation text preserved.</span>{' '}
                  All {preservation.totalChecked} citation{preservation.totalChecked !== 1 ? 's' : ''} verified in the output PDF.
                </p>
              ) : (
                <>
                  <p className="font-medium text-th">
                    {preservation.missing.length} citation{preservation.missing.length !== 1 ? 's' : ''} could not be re-verified in output
                  </p>
                  <p className="mt-1 text-th3">
                    The text may have been normalized differently by the PDF text extractor — review the output manually before filing.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {sealedCount > 0 && (
          <div className="rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: 'var(--bg-card2)' }}>
            <Lock size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            <p className="text-[11px] text-th3">
              Sealed exhibits are not bundled. Their citations are highlighted in the output but do not link out
              (NY ComDiv / sealed-filing compliance).
            </p>
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
                <li>All {bundledExhibitIds.size} exhibit{bundledExhibitIds.size !== 1 ? 's' : ''} appended as pages</li>
                <li>Bookmarks panel for quick navigation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
