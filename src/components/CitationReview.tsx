import { Link, Unlink, ChevronDown, AlertCircle, CheckCircle2, Lock, Trash2, Pencil } from 'lucide-react'
import { useState } from 'react'
import type { Citation, ExhibitFile } from '../utils/types'

interface Props {
  citations: Citation[]
  exhibits: ExhibitFile[]
  fullText: string
  onMapCitation: (citationId: string, exhibitId: string | undefined) => void
  onPinCiteChange: (citationId: string, pinCitePage: number | undefined) => void
  onRemoveCitation: (citationId: string) => void
}

export default function CitationReview({
  citations, exhibits, fullText, onMapCitation, onPinCiteChange, onRemoveCitation,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const linked = citations.filter(c => c.exhibitId)
  const unlinked = citations.filter(c => !c.exhibitId)
  const sealedLinkedCount = linked.filter(c => {
    const ex = exhibits.find(e => e.id === c.exhibitId)
    return ex?.sealed
  }).length

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Citations" value={citations.length} color="var(--accent)" />
        <StatCard label="Linked" value={linked.length} color="var(--success)" />
        <StatCard label="Unlinked" value={unlinked.length} color="var(--warning)" />
      </div>

      {sealedLinkedCount > 0 && (
        <div className="card p-3 text-[11px] text-th2 flex items-start gap-2 border-l-4"
             style={{ borderLeftColor: 'var(--warning)' }}>
          <Lock size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
          <span>
            {sealedLinkedCount} citation{sealedLinkedCount !== 1 ? 's reference' : ' references'} a sealed exhibit.
            Those citations will be highlighted in the output but no outbound link will be emitted.
          </span>
        </div>
      )}

      {/* Unlinked citations first */}
      {unlinked.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-medium text-th flex items-center gap-2 mb-3">
            <AlertCircle size={16} style={{ color: 'var(--warning)' }} />
            Unlinked Citations ({unlinked.length})
          </h3>
          <div className="space-y-1">
            {unlinked.map(cit => (
              <CitationRow
                key={cit.id}
                citation={cit}
                exhibits={exhibits}
                fullText={fullText}
                expanded={expandedId === cit.id}
                onToggle={() => setExpandedId(expandedId === cit.id ? null : cit.id)}
                onMap={onMapCitation}
                onPinCite={onPinCiteChange}
                onRemove={onRemoveCitation}
              />
            ))}
          </div>
        </div>
      )}

      {/* Linked citations */}
      {linked.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-medium text-th flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
            Linked Citations ({linked.length})
          </h3>
          <div className="space-y-1">
            {linked.map(cit => (
              <CitationRow
                key={cit.id}
                citation={cit}
                exhibits={exhibits}
                fullText={fullText}
                expanded={expandedId === cit.id}
                onToggle={() => setExpandedId(expandedId === cit.id ? null : cit.id)}
                onMap={onMapCitation}
                onPinCite={onPinCiteChange}
                onRemove={onRemoveCitation}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CitationRow({
  citation, exhibits, fullText, expanded, onToggle, onMap, onPinCite, onRemove,
}: {
  citation: Citation
  exhibits: ExhibitFile[]
  fullText: string
  expanded: boolean
  onToggle: () => void
  onMap: (citationId: string, exhibitId: string | undefined) => void
  onPinCite: (citationId: string, pinCitePage: number | undefined) => void
  onRemove: (citationId: string) => void
}) {
  const linkedExhibit = exhibits.find(e => e.id === citation.exhibitId)
  const isSealed = linkedExhibit?.sealed === true
  const contextStart = Math.max(0, citation.startIndex - 60)
  const contextEnd = Math.min(fullText.length, citation.endIndex + 60)
  const before = fullText.slice(contextStart, citation.startIndex)
  const citText = fullText.slice(citation.startIndex, citation.endIndex)
  const after = fullText.slice(citation.endIndex, contextEnd)

  return (
    <div className="rounded-lg border border-th2 overflow-hidden">
      <button onClick={onToggle}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-90 transition-colors"
              style={{ backgroundColor: 'var(--bg-card2)' }}>
        {citation.exhibitId
          ? (isSealed ? <Lock size={14} style={{ color: 'var(--warning)' }} />
                      : <Link size={14} style={{ color: 'var(--success)' }} />)
          : <Unlink size={14} style={{ color: 'var(--warning)' }} />
        }
        <span className="text-xs font-medium text-th flex-1 truncate">
          "{citation.text}"
          <span className="text-th3 font-normal ml-2">p. {citation.pageNumber}</span>
          {citation.pinCitePage && (
            <span className="text-th3 font-normal ml-1">→ ex. p. {citation.pinCitePage}</span>
          )}
          {citation.manual && (
            <span className="ml-2 text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(26, 74, 115, 0.12)', color: 'var(--accent)' }}>
              <Pencil size={8} className="inline mr-0.5" />Manual
            </span>
          )}
        </span>
        {linkedExhibit && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: isSealed ? 'rgba(217, 119, 6, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                  color: isSealed ? 'var(--warning)' : 'var(--success)',
                }}>
            {linkedExhibit.label}{isSealed ? ' • sealed' : ''}
          </span>
        )}
        <ChevronDown size={14} className={`text-th3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 py-3 space-y-3 border-t border-th2">
          {/* Context preview */}
          <div className="text-xs text-th2 leading-relaxed rounded-lg p-2"
               style={{ backgroundColor: 'var(--bg-input)' }}>
            <span className="text-th3">...{before}</span>
            <span className="citation-highlight font-medium">{citText}</span>
            <span className="text-th3">{after}...</span>
          </div>

          {/* Exhibit selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-th3 shrink-0">Link to:</label>
            <select
              value={citation.exhibitId || ''}
              onChange={e => onMap(citation.id, e.target.value || undefined)}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg border input-bg border-th2 text-th"
            >
              <option value="">— Not linked —</option>
              {exhibits.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.label}{ex.sealed ? ' (sealed)' : ''} ({ex.file.name})
                </option>
              ))}
            </select>
          </div>

          {/* Pin-cite page */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-th3 shrink-0">Pin-cite page:</label>
            <input
              type="number"
              min={1}
              value={citation.pinCitePage ?? ''}
              onChange={e => {
                const v = e.target.value.trim()
                onPinCite(citation.id, v === '' ? undefined : Math.max(1, parseInt(v, 10) || 1))
              }}
              placeholder="e.g. 12"
              className="flex-1 text-xs px-2 py-1.5 rounded-lg border input-bg border-th2 text-th"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => onRemove(citation.id)}
              className="text-[11px] flex items-center gap-1 hover:opacity-80"
              style={{ color: 'var(--danger)' }}
            >
              <Trash2 size={11} /> Remove citation
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] text-th3 mt-0.5">{label}</p>
    </div>
  )
}
