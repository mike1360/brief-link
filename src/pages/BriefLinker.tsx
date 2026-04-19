import { useState, useCallback, useRef } from 'react'
import { RotateCcw, Wand2, ArrowRight, Loader2, AlertTriangle, Save, Upload, ScanText } from 'lucide-react'
import Header from '../components/Header'
import StepIndicator from '../components/StepIndicator'
import BriefUpload from '../components/BriefUpload'
import ExhibitUpload from '../components/ExhibitUpload'
import CitationReview from '../components/CitationReview'
import BriefPreview from '../components/BriefPreview'
import DownloadPanel from '../components/DownloadPanel'
import { extractTextFromPdf, buildLinkedPdf, verifyCitationPreservation } from '../utils/pdfProcessor'
import {
  parseCitations,
  autoMapCitations,
  normalizeLabel,
  isLikelyFlattened,
  extractPinCite,
  pageNumberForOffset,
  makeManualCitationId,
} from '../utils/citationParser'
import { buildSession, downloadSession, readSessionFile, restoreSession, type Session } from '../utils/session'
import { docxToPdf, isDocx } from '../utils/docxToPdf'
import { ocrPdf } from '../utils/ocr'
import type { WorkflowStep, ExhibitFile, Citation, PageText, PreservationReport } from '../utils/types'

let exhibitIdCounter = 0

export default function BriefLinker() {
  const [step, setStep] = useState<WorkflowStep>('upload')
  const [briefFile, setBriefFile] = useState<File | null>(null)
  const [exhibits, setExhibits] = useState<ExhibitFile[]>([])
  const [citations, setCitations] = useState<Citation[]>([])
  const [pages, setPages] = useState<PageText[]>([])
  const [fullText, setFullText] = useState('')
  const [linkedPdfUrl, setLinkedPdfUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flattenedWarning, setFlattenedWarning] = useState<string | null>(null)
  const [preservation, setPreservation] = useState<PreservationReport | null>(null)
  const [pendingSession, setPendingSession] = useState<Session | null>(null)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)
  const [convertingBrief, setConvertingBrief] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<{ current: number; total: number; phase: string } | null>(null)
  const sessionInputRef = useRef<HTMLInputElement | null>(null)

  // Guess exhibit label from filename: "Exhibit_A.pdf" -> "Exhibit A",
  // "attachment-5.pdf" -> "Attachment 5", "Att_B.pdf" -> "Attachment B"
  const guessLabel = (name: string): string => {
    const att = name.match(/(?:attachment|att)[_\-\s]*([A-Z]{1,3}|\d{1,4})/i)
    if (att) return `Attachment ${att[1].toUpperCase()}`
    const ex = name.match(/(?:exhibit|exh|ex)[_\-\s]*([A-Z]{1,3}|\d{1,4})/i)
    if (ex) return `Exhibit ${ex[1].toUpperCase()}`
    return `Exhibit ${String.fromCharCode(65 + exhibits.length)}`
  }

  const handleAddExhibits = useCallback((files: FileList) => {
    const newExhibits: ExhibitFile[] = Array.from(files).map(f => ({
      id: `ex-${++exhibitIdCounter}`,
      label: guessLabel(f.name),
      file: f,
      url: URL.createObjectURL(f),
    }))
    setExhibits(prev => [...prev, ...newExhibits])
  }, [exhibits.length])

  const handleRemoveExhibit = useCallback((id: string) => {
    setExhibits(prev => {
      const ex = prev.find(e => e.id === id)
      if (ex) URL.revokeObjectURL(ex.url)
      return prev.filter(e => e.id !== id)
    })
  }, [])

  const handleLabelChange = useCallback((id: string, label: string) => {
    setExhibits(prev => prev.map(e => e.id === id ? { ...e, label } : e))
  }, [])

  const handleSealedToggle = useCallback((id: string, sealed: boolean) => {
    setExhibits(prev => prev.map(e => e.id === id ? { ...e, sealed } : e))
  }, [])

  const handleProcess = useCallback(async () => {
    if (!briefFile) return
    setProcessing(true)
    setError(null)
    setFlattenedWarning(null)
    setStep('processing')

    try {
      const extractedPages = await extractTextFromPdf(briefFile)
      setPages(extractedPages)

      const text = extractedPages.map(p => p.text).join('')
      setFullText(text)

      if (isLikelyFlattened(extractedPages)) {
        setFlattenedWarning(
          'This brief has little or no extractable text — it may be a Print-to-PDF flattened file or a scan without OCR. Citations cannot be detected automatically. Re-export the brief with Save As PDF (Word) or Create PDF (Acrobat) to preserve the text layer, or add citations manually from the preview.',
        )
      }

      // Resume an in-progress session instead of re-parsing if one was loaded.
      if (pendingSession) {
        const { exhibits: restoredExhibits, citations: restoredCitations, missing } =
          restoreSession(pendingSession, exhibits)
        setExhibits(restoredExhibits)
        setCitations(restoredCitations)
        const msg = missing.length > 0
          ? `Resumed session. ${missing.length} exhibit file${missing.length !== 1 ? 's' : ''} not found: ${missing.join(', ')}. Their citations will be unlinked.`
          : `Resumed session from ${new Date(pendingSession.savedAt).toLocaleString()}.`
        setSessionMessage(msg)
        setPendingSession(null)
        setStep('review')
        return
      }

      const result = parseCitations(extractedPages)

      const labelMap = new Map<string, string>()
      for (const ex of exhibits) {
        const match = ex.label.match(/(?:exhibit|exh|ex|attachment|att)\s*([A-Z]{1,3}(?:-\d+)?|\d{1,4})/i)
        if (match) {
          labelMap.set(normalizeLabel(match[1]), ex.id)
        }
      }
      autoMapCitations(result.citations, labelMap)

      setCitations(result.citations)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process brief')
      setStep('upload')
    } finally {
      setProcessing(false)
    }
  }, [briefFile, exhibits, pendingSession])

  /** Accept a PDF directly or convert a DOCX to PDF before storing. */
  const handleBriefSelect = useCallback(async (file: File) => {
    setError(null)
    if (isDocx(file)) {
      setConvertingBrief(true)
      try {
        const converted = await docxToPdf(file)
        setBriefFile(converted)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to convert DOCX to PDF')
      } finally {
        setConvertingBrief(false)
      }
    } else {
      setBriefFile(file)
    }
  }, [])

  const handleSaveSession = useCallback(() => {
    if (!briefFile) return
    const session = buildSession({
      briefFileName: briefFile.name,
      exhibits,
      citations,
    })
    downloadSession(session)
  }, [briefFile, exhibits, citations])

  /** OCR the current brief and re-run citation detection using OCR'd text. */
  const handleRunOcr = useCallback(async () => {
    if (!briefFile) return
    setError(null)
    setOcrProgress({ current: 0, total: 0, phase: 'Starting…' })

    try {
      const ocrPages = await ocrPdf(briefFile, (current, total, phase) => {
        setOcrProgress({ current, total, phase })
      })
      setPages(ocrPages)
      const text = ocrPages.map(p => p.text).join('')
      setFullText(text)

      const result = parseCitations(ocrPages)
      const labelMap = new Map<string, string>()
      for (const ex of exhibits) {
        const match = ex.label.match(/(?:exhibit|exh|ex|attachment|att)\s*([A-Z]{1,3}(?:-\d+)?|\d{1,4})/i)
        if (match) labelMap.set(normalizeLabel(match[1]), ex.id)
      }
      autoMapCitations(result.citations, labelMap)
      setCitations(result.citations)
      setFlattenedWarning(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed')
    } finally {
      setOcrProgress(null)
    }
  }, [briefFile, exhibits])

  const handleLoadSessionFile = useCallback(async (file: File) => {
    try {
      const session = await readSessionFile(file)
      setPendingSession(session)
      setSessionMessage(
        `Session loaded from "${file.name}" — upload ${session.briefFileName} and ${session.exhibits.length} exhibit file${session.exhibits.length !== 1 ? 's' : ''}, then click Scan to resume.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session file')
    }
  }, [])

  const handleMapCitation = useCallback((citationId: string, exhibitId: string | undefined) => {
    setCitations(prev => prev.map(c =>
      c.id === citationId ? { ...c, exhibitId } : c
    ))
  }, [])

  /** Apply a citation's exhibit mapping to every other citation that shares its normalized label. */
  const handleMapAllLike = useCallback((citationId: string, exhibitId: string | undefined) => {
    setCitations(prev => {
      const target = prev.find(c => c.id === citationId)
      if (!target) return prev
      return prev.map(c =>
        c.normalizedLabel === target.normalizedLabel ? { ...c, exhibitId } : c
      )
    })
  }, [])

  const handlePinCiteChange = useCallback((citationId: string, pinCitePage: number | undefined) => {
    setCitations(prev => prev.map(c =>
      c.id === citationId ? { ...c, pinCitePage } : c
    ))
  }, [])

  const handleRemoveCitation = useCallback((citationId: string) => {
    setCitations(prev => prev.filter(c => c.id !== citationId))
  }, [])

  const handleAddCitation = useCallback((input: {
    startIndex: number
    endIndex: number
    text: string
    exhibitId?: string
  }) => {
    const pageNumber = pageNumberForOffset(pages, input.startIndex)
    const pinCitePage = extractPinCite(fullText, input.endIndex)
    const newCit: Citation = {
      id: makeManualCitationId(),
      text: input.text,
      normalizedLabel: normalizeLabel(input.text.replace(/^[^A-Za-z0-9]+/, '').slice(0, 8)),
      startIndex: input.startIndex,
      endIndex: input.endIndex,
      pageNumber,
      exhibitId: input.exhibitId,
      pinCitePage,
      manual: true,
    }
    setCitations(prev => [...prev, newCit].sort((a, b) => a.startIndex - b.startIndex))
  }, [pages, fullText])

  const handleGenerateOutput = useCallback(async () => {
    if (!briefFile) return
    setProcessing(true)
    setError(null)
    setPreservation(null)

    try {
      const exhibitMap = new Map(exhibits.map(e => [e.id, e]))
      const pdfBytes = await buildLinkedPdf(briefFile, citations, exhibitMap, pages)
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      setLinkedPdfUrl(URL.createObjectURL(blob))

      try {
        const report = await verifyCitationPreservation(pdfBytes, citations, pages.length)
        setPreservation(report)
      } catch {
        // Non-fatal: the download still works even if re-verification fails.
        setPreservation(null)
      }

      setStep('download')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate linked PDF')
    } finally {
      setProcessing(false)
    }
  }, [briefFile, citations, exhibits, pages])

  const handleReset = useCallback(() => {
    if (linkedPdfUrl) URL.revokeObjectURL(linkedPdfUrl)
    for (const ex of exhibits) URL.revokeObjectURL(ex.url)
    setBriefFile(null)
    setExhibits([])
    setCitations([])
    setPages([])
    setFullText('')
    setLinkedPdfUrl(null)
    setError(null)
    setFlattenedWarning(null)
    setPreservation(null)
    setPendingSession(null)
    setSessionMessage(null)
    setStep('upload')
  }, [linkedPdfUrl, exhibits])

  const linkedCount = citations.filter(c => c.exhibitId).length
  const canProcess = briefFile && exhibits.length > 0
  const canGenerate = linkedCount > 0

  // Review uses a wider container so the preview has room; other steps stay tight.
  const stepWidthClass = step === 'review' ? 'max-w-7xl' : 'max-w-4xl'

  return (
    <div className="min-h-screen page-bg">
      <Header />
      <main className={`${stepWidthClass} mx-auto px-4 pb-12`}>
        <StepIndicator current={step} />

        {error && (
          <div className="card p-4 mb-4 border-l-4" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm text-th">{error}</p>
          </div>
        )}

        {sessionMessage && step !== 'download' && (
          <div className="card p-3 mb-4 border-l-4 flex items-start gap-3"
               style={{ borderLeftColor: 'var(--accent)' }}>
            <Upload size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <p className="text-xs text-th2 flex-1">{sessionMessage}</p>
            <button onClick={() => setSessionMessage(null)} className="text-th3 hover:opacity-70 text-xs">
              Dismiss
            </button>
          </div>
        )}

        {flattenedWarning && step !== 'upload' && (
          <div className="card p-4 mb-4 border-l-4 flex items-start gap-3"
               style={{ borderLeftColor: 'var(--warning)' }}>
            <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            <div className="flex-1">
              <p className="text-sm font-medium text-th">Low or missing text layer detected</p>
              <p className="text-xs text-th2 mt-1">{flattenedWarning}</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={handleRunOcr}
                  disabled={!!ocrProgress}
                  className="btn-primary text-xs py-1 px-2"
                >
                  {ocrProgress ? <Loader2 size={12} className="animate-spin" /> : <ScanText size={12} />}
                  {ocrProgress ? ocrProgress.phase : 'Run OCR'}
                </button>
                {ocrProgress && ocrProgress.total > 0 && (
                  <span className="text-[11px] text-th3">
                    {ocrProgress.current}/{ocrProgress.total} pages
                  </span>
                )}
              </div>
              {ocrProgress && (
                <p className="text-[10px] text-th3 mt-1 italic">
                  First run downloads the OCR engine (~10 MB). Subsequent runs are cached by the browser.
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-th mb-1">Upload Your Brief & Exhibits</h2>
                <p className="text-sm text-th3">
                  Upload the brief PDF and the exhibit files. Brief Link will scan for exhibit citations
                  and create hyperlinks automatically.
                </p>
              </div>
              <button
                onClick={() => sessionInputRef.current?.click()}
                className="btn-secondary text-xs shrink-0"
                title="Load a previously-saved session (.json) to resume work"
              >
                <Upload size={14} />
                Load Session
              </button>
              <input
                ref={sessionInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleLoadSessionFile(f)
                  e.target.value = '' // allow re-selecting the same file
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-th2 mb-2 block">Brief Document</label>
                <BriefUpload
                  file={briefFile}
                  busy={convertingBrief}
                  onFileSelect={handleBriefSelect}
                  onClear={() => setBriefFile(null)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-th2 mb-2 block">Exhibit Files</label>
                <ExhibitUpload
                  exhibits={exhibits}
                  onAdd={handleAddExhibits}
                  onRemove={handleRemoveExhibit}
                  onLabelChange={handleLabelChange}
                  onSealedToggle={handleSealedToggle}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleProcess}
                disabled={!canProcess || processing}
                className="btn-primary"
              >
                {processing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                Scan for Citations
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Processing */}
        {step === 'processing' && (
          <div className="card p-12 text-center">
            <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: 'var(--accent)' }} />
            <h2 className="text-base font-semibold text-th">Processing Brief...</h2>
            <p className="text-sm text-th3 mt-1">Extracting text and scanning for exhibit citations</p>
          </div>
        )}

        {/* STEP 3: Review */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-th">Review Citations</h2>
                <p className="text-sm text-th3">
                  {citations.length} citation{citations.length !== 1 ? 's' : ''} found.
                  Click any citation in the preview to edit, or highlight text to add new ones.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleReset} className="btn-secondary">
                  <RotateCcw size={14} />
                  Start Over
                </button>
                <button onClick={handleSaveSession} className="btn-secondary"
                        title="Download a JSON snapshot to resume this review later">
                  <Save size={14} />
                  Save Session
                </button>
                <button onClick={handleGenerateOutput} disabled={!canGenerate || processing} className="btn-primary">
                  {processing ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  Generate Linked Brief
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4 items-start">
              <CitationReview
                citations={citations}
                exhibits={exhibits}
                fullText={fullText}
                onMapCitation={handleMapCitation}
                onMapAllLike={handleMapAllLike}
                onPinCiteChange={handlePinCiteChange}
                onRemoveCitation={handleRemoveCitation}
              />
              <BriefPreview
                fullText={fullText}
                citations={citations}
                exhibits={exhibits}
                onMapCitation={handleMapCitation}
                onMapAllLike={handleMapAllLike}
                onPinCiteChange={handlePinCiteChange}
                onRemoveCitation={handleRemoveCitation}
                onAddCitation={handleAddCitation}
              />
            </div>
          </div>
        )}

        {/* STEP 4: Download */}
        {step === 'download' && (
          <div className="max-w-md mx-auto space-y-4">
            <DownloadPanel
              linkedPdfUrl={linkedPdfUrl}
              citations={citations}
              exhibits={exhibits}
              briefFileName={briefFile?.name || 'brief'}
              preservation={preservation}
            />
            <button onClick={handleReset} className="btn-secondary w-full">
              <RotateCcw size={14} />
              Process Another Brief
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
