import { useState, useCallback, useMemo } from 'react'
import { RotateCcw, Wand2, ArrowRight, Loader2 } from 'lucide-react'
import Header from '../components/Header'
import StepIndicator from '../components/StepIndicator'
import BriefUpload from '../components/BriefUpload'
import ExhibitUpload from '../components/ExhibitUpload'
import CitationReview from '../components/CitationReview'
import BriefPreview from '../components/BriefPreview'
import DownloadPanel from '../components/DownloadPanel'
import { extractTextFromPdf, buildLinkedPdf } from '../utils/pdfProcessor'
import { parseCitations, autoMapCitations, normalizeLabel } from '../utils/citationParser'
import type { WorkflowStep, ExhibitFile, Citation, PageText } from '../utils/types'

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

  // Guess exhibit label from filename: "Exhibit_A.pdf" -> "Exhibit A", "ExA.pdf" -> "Exhibit A"
  const guessLabel = (name: string): string => {
    // Try patterns like "Exhibit A", "Exhibit_A", "Ex-A", "Exhibit 1"
    const match = name.match(/(?:exhibit|ex)[_\-\s]*([A-Z]{1,3}|\d{1,4})/i)
    if (match) return `Exhibit ${match[1].toUpperCase()}`
    // Fallback to filename without extension
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

  const handleProcess = useCallback(async () => {
    if (!briefFile) return
    setProcessing(true)
    setError(null)
    setStep('processing')

    try {
      // Step 1: Extract text from PDF
      const extractedPages = await extractTextFromPdf(briefFile)
      setPages(extractedPages)

      const text = extractedPages.map(p => p.text).join('')
      setFullText(text)

      // Step 2: Parse citations
      const result = parseCitations(extractedPages)
      let foundCitations = result.citations

      // Step 3: Auto-map citations to exhibits
      const labelMap = new Map<string, string>()
      for (const ex of exhibits) {
        // Extract the label identifier: "Exhibit A" -> "A", "Exhibit 1" -> "1"
        const match = ex.label.match(/(?:exhibit|ex)\s*([A-Z]{1,3}(?:-\d+)?|\d{1,4})/i)
        if (match) {
          labelMap.set(normalizeLabel(match[1]), ex.id)
        }
      }
      const mapped = autoMapCitations(foundCitations, labelMap)

      setCitations(foundCitations)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process brief')
      setStep('upload')
    } finally {
      setProcessing(false)
    }
  }, [briefFile, exhibits])

  const handleMapCitation = useCallback((citationId: string, exhibitId: string | undefined) => {
    setCitations(prev => prev.map(c =>
      c.id === citationId ? { ...c, exhibitId } : c
    ))
  }, [])

  const handleGenerateOutput = useCallback(async () => {
    if (!briefFile) return
    setProcessing(true)

    try {
      const exhibitMap = new Map(exhibits.map(e => [e.id, e]))

      // Try to build linked PDF
      try {
        const pdfBytes = await buildLinkedPdf(briefFile, citations, exhibitMap, pages)
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })
        setLinkedPdfUrl(URL.createObjectURL(blob))
      } catch {
        // PDF linking is best-effort; HTML is the primary output
      }

      setStep('download')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate output')
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
    setStep('upload')
  }, [linkedPdfUrl, exhibits])

  const linkedCount = citations.filter(c => c.exhibitId).length
  const canProcess = briefFile && exhibits.length > 0
  const canGenerate = linkedCount > 0

  return (
    <div className="min-h-screen page-bg">
      <Header />
      <main className="max-w-4xl mx-auto px-4 pb-12">
        <StepIndicator current={step} />

        {error && (
          <div className="card p-4 mb-4 border-l-4" style={{ borderLeftColor: 'var(--danger)' }}>
            <p className="text-sm text-th">{error}</p>
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-th mb-1">Upload Your Brief & Exhibits</h2>
              <p className="text-sm text-th3">
                Upload the brief PDF and the exhibit files. Brief Link will scan for exhibit citations
                and create hyperlinks automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-th2 mb-2 block">Brief Document</label>
                <BriefUpload
                  file={briefFile}
                  onFileSelect={setBriefFile}
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

        {/* STEP 2: Processing (shown briefly) */}
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
                  Review the mappings and adjust as needed.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleReset} className="btn-secondary">
                  <RotateCcw size={14} />
                  Start Over
                </button>
                <button onClick={handleGenerateOutput} disabled={!canGenerate || processing} className="btn-primary">
                  {processing ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  Generate Linked Brief
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CitationReview
                citations={citations}
                exhibits={exhibits}
                fullText={fullText}
                onMapCitation={handleMapCitation}
              />
              <BriefPreview
                fullText={fullText}
                citations={citations}
                exhibits={exhibits}
              />
            </div>
          </div>
        )}

        {/* STEP 4: Download */}
        {step === 'download' && (
          <div className="max-w-md mx-auto space-y-4">
            <DownloadPanel
              linkedPdfUrl={linkedPdfUrl}
              fullText={fullText}
              citations={citations}
              exhibits={exhibits}
              briefFileName={briefFile?.name || 'brief'}
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
