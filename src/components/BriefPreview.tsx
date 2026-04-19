import { Eye, ExternalLink, Plus, Trash2, X, Lock } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Citation, ExhibitFile } from '../utils/types'

interface Props {
  fullText: string
  citations: Citation[]
  exhibits: ExhibitFile[]
  onMapCitation: (citationId: string, exhibitId: string | undefined) => void
  onPinCiteChange: (citationId: string, pinCitePage: number | undefined) => void
  onRemoveCitation: (citationId: string) => void
  onAddCitation: (input: { startIndex: number; endIndex: number; text: string; exhibitId?: string }) => void
}

interface EditPopover {
  kind: 'edit'
  citationId: string
  anchor: { top: number; left: number }
}

interface AddPopover {
  kind: 'add'
  startIndex: number
  endIndex: number
  text: string
  anchor: { top: number; left: number }
}

type Popover = EditPopover | AddPopover | null

export default function BriefPreview({
  fullText,
  citations,
  exhibits,
  onMapCitation,
  onPinCiteChange,
  onRemoveCitation,
  onAddCitation,
}: Props) {
  const exhibitMap = useMemo(() => {
    const map = new Map<string, ExhibitFile>()
    for (const ex of exhibits) map.set(ex.id, ex)
    return map
  }, [exhibits])

  const scrollRef = useRef<HTMLDivElement>(null)
  const [popover, setPopover] = useState<Popover>(null)

  const segments = useMemo(() => {
    const sorted = [...citations].sort((a, b) => a.startIndex - b.startIndex)
    const result: Array<
      | { kind: 'text'; text: string; offset: number }
      | { kind: 'citation'; text: string; citation: Citation; exhibit?: ExhibitFile }
    > = []
    let cursor = 0

    for (const cit of sorted) {
      // Skip zero- or negative-width citations and overlaps past the cursor.
      if (cit.endIndex <= cursor) continue
      if (cit.startIndex > cursor) {
        result.push({ kind: 'text', text: fullText.slice(cursor, cit.startIndex), offset: cursor })
      }
      const start = Math.max(cit.startIndex, cursor)
      const exhibit = cit.exhibitId ? exhibitMap.get(cit.exhibitId) : undefined
      result.push({
        kind: 'citation',
        text: fullText.slice(start, cit.endIndex),
        citation: cit,
        exhibit,
      })
      cursor = cit.endIndex
    }

    if (cursor < fullText.length) {
      result.push({ kind: 'text', text: fullText.slice(cursor), offset: cursor })
    }

    return result
  }, [fullText, citations, exhibitMap])

  // Offsets spanned by existing citations — used to reject selections that
  // overlap already-detected text.
  const citationRanges = useMemo(() => {
    return citations
      .map(c => [c.startIndex, c.endIndex] as const)
      .sort((a, b) => a[0] - b[0])
  }, [citations])

  /**
   * Compute viewport-relative coords for the popover. Uses `position: fixed`
   * so the popover escapes the scroll container (which was clipping it at
   * the right edge). Flips above the target if there isn't enough room
   * below, and clamps horizontally inside the viewport.
   */
  function positionFor(rect: DOMRect): { top: number; left: number } {
    const POP_WIDTH = 320
    const POP_HEIGHT_EST = 280
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight

    const belowTop = rect.bottom + 6
    const aboveTop = rect.top - POP_HEIGHT_EST - 6
    const fitsBelow = belowTop + POP_HEIGHT_EST + margin <= vh
    const top = fitsBelow ? belowTop : Math.max(margin, aboveTop)
    const left = Math.max(margin, Math.min(rect.left, vw - POP_WIDTH - margin))

    return { top, left }
  }

  function handleCitationClick(e: React.MouseEvent, citation: Citation) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopover({ kind: 'edit', citationId: citation.id, anchor: positionFor(rect) })
  }

  /** Get the character offset in fullText for a given DOM (node, offset). */
  function resolveOffset(node: Node | null, offset: number): number | null {
    if (!node) return null
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
    if (!el) return null
    const segEl = el.closest<HTMLElement>('[data-seg-offset],[data-seg-citation]')
    if (!segEl) return null
    if (segEl.dataset.segOffset !== undefined) {
      return parseInt(segEl.dataset.segOffset, 10) + offset
    }
    if (segEl.dataset.segCitation) {
      const cit = citations.find(c => c.id === segEl.dataset.segCitation)
      if (!cit) return null
      return cit.startIndex + offset
    }
    return null
  }

  function overlapsCitation(start: number, end: number): boolean {
    for (const [cs, ce] of citationRanges) {
      if (start < ce && end > cs) return true
    }
    return false
  }

  function handleMouseUp() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    if (!scrollRef.current?.contains(range.commonAncestorContainer)) return

    const startOffset = resolveOffset(range.startContainer, range.startOffset)
    const endOffset = resolveOffset(range.endContainer, range.endOffset)
    if (startOffset === null || endOffset === null) return

    const start = Math.min(startOffset, endOffset)
    const end = Math.max(startOffset, endOffset)
    if (end - start < 2) return
    if (overlapsCitation(start, end)) return

    const text = fullText.slice(start, end).trim()
    if (!text) return
    // Snap start/end to trimmed bounds.
    const leading = fullText.slice(start, end).length - fullText.slice(start, end).trimStart().length
    const trailing = fullText.slice(start, end).length - fullText.slice(start, end).trimEnd().length
    const snapStart = start + leading
    const snapEnd = end - trailing

    const rect = range.getBoundingClientRect()
    setPopover({
      kind: 'add',
      startIndex: snapStart,
      endIndex: snapEnd,
      text: fullText.slice(snapStart, snapEnd),
      anchor: positionFor(rect),
    })
  }

  // Dismiss the popover on outside click or when the preview scrolls
  // (target citation moves out from under a fixed-position popover).
  useEffect(() => {
    if (!popover) return
    function onDown(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest('[data-preview-popover]')) return
      if (target.closest('[data-seg-citation]')) return
      setPopover(null)
    }
    function onScroll() {
      setPopover(null)
    }
    document.addEventListener('mousedown', onDown)
    const el = scrollRef.current
    el?.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      el?.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
    }
  }, [popover])

  // Clear popover if its citation was removed underneath it.
  useEffect(() => {
    if (popover?.kind === 'edit' && !citations.find(c => c.id === popover.citationId)) {
      setPopover(null)
    }
  }, [citations, popover])

  const activeEdit = popover?.kind === 'edit' ? citations.find(c => c.id === popover.citationId) : undefined

  return (
    <div className="card p-4">
      <h3 className="text-sm font-medium text-th flex items-center gap-2 mb-3">
        <Eye size={16} style={{ color: 'var(--accent)' }} />
        Brief Preview
        <span className="text-[10px] font-normal text-th3 ml-auto">
          Click a citation to edit. Select text to add a new one.
        </span>
      </h3>
      <div
        ref={scrollRef}
        onMouseUp={handleMouseUp}
        className="relative overflow-y-auto rounded-lg p-4 text-sm leading-relaxed"
        style={{
          backgroundColor: 'var(--bg-input)',
          fontFamily: "'Georgia', 'Times New Roman', serif",
          height: 'calc(100vh - 320px)',
          minHeight: '500px',
        }}
      >
        {segments.map((seg, i) => {
          if (seg.kind === 'text') {
            return (
              <span key={i} className="text-th" data-seg-offset={seg.offset}>
                {seg.text}
              </span>
            )
          }

          const exhibit = seg.exhibit
          const sealed = exhibit?.sealed
          const isLinked = !!exhibit && !sealed
          const classes = sealed
            ? 'citation-highlight citation-sealed font-medium'
            : isLinked
              ? 'citation-highlight citation-linked font-medium'
              : 'citation-highlight citation-unlinked font-medium'
          const title = sealed
            ? `Sealed — ${exhibit!.label} (no link will be emitted)`
            : isLinked
              ? `Linked to ${exhibit!.label}${seg.citation.pinCitePage ? ` at p. ${seg.citation.pinCitePage}` : ''}`
              : 'No exhibit linked — click to assign'

          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              data-seg-citation={seg.citation.id}
              className={classes}
              title={title}
              onClick={e => handleCitationClick(e, seg.citation)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleCitationClick(e as unknown as React.MouseEvent, seg.citation)
                }
              }}
            >
              {seg.text}
            </span>
          )
        })}

        {popover && (
          <div
            data-preview-popover
            className="card p-3 shadow-lg"
            style={{
              position: 'fixed',
              top: popover.anchor.top,
              left: popover.anchor.left,
              width: 320,
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              zIndex: 50,
            }}
          >
            {popover.kind === 'edit' && activeEdit && (
              <EditControls
                citation={activeEdit}
                exhibits={exhibits}
                exhibit={activeEdit.exhibitId ? exhibitMap.get(activeEdit.exhibitId) : undefined}
                onMap={(exhibitId) => onMapCitation(activeEdit.id, exhibitId)}
                onPinCite={(page) => onPinCiteChange(activeEdit.id, page)}
                onRemove={() => {
                  onRemoveCitation(activeEdit.id)
                  setPopover(null)
                }}
                onClose={() => setPopover(null)}
              />
            )}
            {popover.kind === 'add' && (
              <AddControls
                text={popover.text}
                exhibits={exhibits}
                onSave={(exhibitId) => {
                  onAddCitation({
                    startIndex: popover.startIndex,
                    endIndex: popover.endIndex,
                    text: popover.text,
                    exhibitId,
                  })
                  window.getSelection()?.removeAllRanges()
                  setPopover(null)
                }}
                onClose={() => setPopover(null)}
              />
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-th3 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: 'var(--success)' }} /> Linked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: 'var(--warning)' }} /> Unlinked
        </span>
        <span className="flex items-center gap-1">
          <Lock size={10} style={{ color: 'var(--warning)' }} /> Sealed (no link)
        </span>
      </div>
    </div>
  )
}

function EditControls({
  citation, exhibits, exhibit, onMap, onPinCite, onRemove, onClose,
}: {
  citation: Citation
  exhibits: ExhibitFile[]
  exhibit: ExhibitFile | undefined
  onMap: (exhibitId: string | undefined) => void
  onPinCite: (page: number | undefined) => void
  onRemove: () => void
  onClose: () => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-th truncate">"{citation.text}"</span>
        <button onClick={onClose} className="text-th3 hover:opacity-70 shrink-0">
          <X size={12} />
        </button>
      </div>
      <div>
        <label className="text-[10px] text-th3 block mb-1">Link to exhibit</label>
        <select
          value={citation.exhibitId || ''}
          onChange={e => onMap(e.target.value || undefined)}
          className="w-full text-xs px-2 py-1.5 rounded border input-bg border-th2 text-th"
        >
          <option value="">— Not linked —</option>
          {exhibits.map(ex => (
            <option key={ex.id} value={ex.id}>
              {ex.label}{ex.sealed ? ' (sealed)' : ''} — {ex.file.name}
            </option>
          ))}
        </select>
        {exhibit?.sealed && (
          <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--warning)' }}>
            <Lock size={10} /> Sealed — cite highlighted but no link emitted
          </p>
        )}
      </div>
      <div>
        <label className="text-[10px] text-th3 block mb-1">Pin-cite page (optional)</label>
        <input
          type="number"
          min={1}
          value={citation.pinCitePage ?? ''}
          onChange={e => {
            const v = e.target.value.trim()
            onPinCite(v === '' ? undefined : Math.max(1, parseInt(v, 10) || 1))
          }}
          placeholder="e.g. 12"
          className="w-full text-xs px-2 py-1.5 rounded border input-bg border-th2 text-th"
        />
      </div>
      <div className="flex items-center justify-between pt-1">
        <a
          href={exhibit && !exhibit.sealed ? exhibit.url : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!exhibit || exhibit.sealed}
          className={`text-[11px] flex items-center gap-1 ${!exhibit || exhibit.sealed ? 'pointer-events-none opacity-40' : ''}`}
          style={{ color: 'var(--accent)' }}
        >
          <ExternalLink size={11} /> Open exhibit
        </a>
        <button
          onClick={onRemove}
          className="text-[11px] flex items-center gap-1 hover:opacity-80"
          style={{ color: 'var(--danger)' }}
          title={citation.manual ? 'Delete this manually-added citation' : 'Delete this citation from the list'}
        >
          <Trash2 size={11} /> Remove
        </button>
      </div>
    </div>
  )
}

function AddControls({
  text, exhibits, onSave, onClose,
}: {
  text: string
  exhibits: ExhibitFile[]
  onSave: (exhibitId: string | undefined) => void
  onClose: () => void
}) {
  const [exhibitId, setExhibitId] = useState<string>('')
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-th flex items-center gap-1">
          <Plus size={11} style={{ color: 'var(--accent)' }} /> Add as citation
        </span>
        <button onClick={onClose} className="text-th3 hover:opacity-70">
          <X size={12} />
        </button>
      </div>
      <p className="text-[11px] text-th2 italic truncate">"{text}"</p>
      <div>
        <label className="text-[10px] text-th3 block mb-1">Link to exhibit (optional)</label>
        <select
          value={exhibitId}
          onChange={e => setExhibitId(e.target.value)}
          className="w-full text-xs px-2 py-1.5 rounded border input-bg border-th2 text-th"
        >
          <option value="">— Leave unlinked —</option>
          {exhibits.map(ex => (
            <option key={ex.id} value={ex.id}>
              {ex.label}{ex.sealed ? ' (sealed)' : ''} — {ex.file.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="btn-secondary text-xs py-1 px-2">Cancel</button>
        <button
          onClick={() => onSave(exhibitId || undefined)}
          className="btn-primary text-xs py-1 px-2"
        >
          Add
        </button>
      </div>
    </div>
  )
}
