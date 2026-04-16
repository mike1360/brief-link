import { Eye, FileText } from 'lucide-react'
import { useMemo } from 'react'
import type { Citation, ExhibitFile } from '../utils/types'

interface Props {
  fullText: string
  citations: Citation[]
  exhibits: ExhibitFile[]
}

export default function BriefPreview({ fullText, citations, exhibits }: Props) {
  const exhibitMap = useMemo(() => {
    const map = new Map<string, ExhibitFile>()
    for (const ex of exhibits) map.set(ex.id, ex)
    return map
  }, [exhibits])

  const segments = useMemo(() => {
    const sorted = [...citations].sort((a, b) => a.startIndex - b.startIndex)
    const result: Array<{ text: string; citation?: Citation; exhibit?: ExhibitFile }> = []
    let cursor = 0

    for (const cit of sorted) {
      if (cit.startIndex > cursor) {
        result.push({ text: fullText.slice(cursor, cit.startIndex) })
      }
      const exhibit = cit.exhibitId ? exhibitMap.get(cit.exhibitId) : undefined
      result.push({
        text: fullText.slice(cit.startIndex, cit.endIndex),
        citation: cit,
        exhibit,
      })
      cursor = cit.endIndex
    }

    if (cursor < fullText.length) {
      result.push({ text: fullText.slice(cursor) })
    }

    return result
  }, [fullText, citations, exhibitMap])

  return (
    <div className="card p-4">
      <h3 className="text-sm font-medium text-th flex items-center gap-2 mb-3">
        <Eye size={16} style={{ color: 'var(--accent)' }} />
        Brief Preview
      </h3>
      <div className="max-h-[500px] overflow-y-auto rounded-lg p-4 text-sm leading-relaxed"
           style={{ backgroundColor: 'var(--bg-input)', fontFamily: "'Georgia', 'Times New Roman', serif" }}>
        {segments.map((seg, i) => {
          if (!seg.citation) {
            return <span key={i} className="text-th">{seg.text}</span>
          }

          const isLinked = !!seg.exhibit

          if (isLinked) {
            return (
              <a key={i}
                 href={seg.exhibit!.url}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="citation-highlight citation-linked font-medium"
                 title={`Open ${seg.exhibit!.label}`}>
                {seg.text}
              </a>
            )
          }

          return (
            <span key={i} className="citation-highlight citation-unlinked font-medium"
                  title="No exhibit linked">
              {seg.text}
            </span>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-th3">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: 'var(--success)' }} /> Linked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: 'var(--warning)' }} /> Unlinked
        </span>
      </div>
    </div>
  )
}
