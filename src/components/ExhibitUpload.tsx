import { Plus, FileText, X, Tag } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { ExhibitFile } from '../utils/types'

interface Props {
  exhibits: ExhibitFile[]
  onAdd: (files: FileList) => void
  onRemove: (id: string) => void
  onLabelChange: (id: string, label: string) => void
}

export default function ExhibitUpload({ exhibits, onAdd, onRemove, onLabelChange }: Props) {
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      onAdd(e.dataTransfer.files)
    }
  }, [onAdd])

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-th flex items-center gap-2">
          <Tag size={16} style={{ color: 'var(--accent)' }} />
          Exhibits ({exhibits.length})
        </h3>
      </div>

      {exhibits.length > 0 && (
        <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
          {exhibits.map(ex => (
            <div key={ex.id} className="flex items-center gap-2 p-2 rounded-lg"
                 style={{ backgroundColor: 'var(--bg-card2)' }}>
              <FileText size={16} className="text-th3 shrink-0" />
              <input
                type="text"
                value={ex.label}
                onChange={e => onLabelChange(ex.id, e.target.value)}
                className="flex-1 text-xs font-medium px-2 py-1 rounded border input-bg border-th2 text-th min-w-0"
                placeholder="Exhibit A"
              />
              <span className="text-[10px] text-th3 shrink-0 max-w-[100px] truncate">{ex.file.name}</span>
              <button onClick={() => onRemove(ex.id)} className="p-1 rounded hover:opacity-70 text-th3 shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${dragOver ? 'border-th' : 'border-th2'}`}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
      >
        <label className="flex flex-col items-center gap-2 cursor-pointer">
          <Plus size={20} className="text-th3" />
          <span className="text-xs text-th3">Add exhibit files (PDF, images, docs)</span>
          <input type="file" multiple className="hidden"
                 onChange={e => e.target.files && onAdd(e.target.files)} />
        </label>
      </div>
    </div>
  )
}
