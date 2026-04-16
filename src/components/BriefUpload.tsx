import { FileUp, FileText, X } from 'lucide-react'
import { useCallback } from 'react'

interface Props {
  file: File | null
  onFileSelect: (file: File) => void
  onClear: () => void
}

export default function BriefUpload({ file, onFileSelect, onClear }: Props) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.type === 'application/pdf') {
      onFileSelect(dropped)
    }
  }, [onFileSelect])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) onFileSelect(selected)
  }, [onFileSelect])

  if (file) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                 style={{ backgroundColor: 'rgba(26, 74, 115, 0.1)' }}>
              <FileText size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-th">{file.name}</p>
              <p className="text-xs text-th3">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button onClick={onClear} className="p-1.5 rounded-lg hover:opacity-70 text-th3">
            <X size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-8"
         onDrop={handleDrop}
         onDragOver={e => e.preventDefault()}>
      <label className="flex flex-col items-center gap-3 cursor-pointer">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center"
             style={{ backgroundColor: 'rgba(26, 74, 115, 0.08)' }}>
          <FileUp size={28} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-th">Upload Brief (PDF)</p>
          <p className="text-xs text-th3 mt-1">Drag & drop or click to browse</p>
        </div>
        <input type="file" accept=".pdf" className="hidden" onChange={handleChange} />
      </label>
    </div>
  )
}
