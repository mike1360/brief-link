import { Upload, Cpu, CheckCircle, Download } from 'lucide-react'
import type { WorkflowStep } from '../utils/types'

const STEPS: { key: WorkflowStep; label: string; icon: typeof Upload }[] = [
  { key: 'upload',     label: 'Upload',   icon: Upload },
  { key: 'processing', label: 'Process',  icon: Cpu },
  { key: 'review',     label: 'Review',   icon: CheckCircle },
  { key: 'download',   label: 'Download', icon: Download },
]

interface Props {
  current: WorkflowStep
}

export default function StepIndicator({ current }: Props) {
  const currentIdx = STEPS.findIndex(s => s.key === current)

  return (
    <div className="flex items-center justify-center gap-1 py-6">
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const isActive = i === currentIdx
        const isDone = i < currentIdx

        return (
          <div key={step.key} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isActive
                ? 'text-white'
                : isDone
                  ? 'text-th2'
                  : 'text-th3 opacity-50'
            }`}
            style={isActive ? { backgroundColor: 'var(--accent)' } : isDone ? { backgroundColor: 'var(--bg-card2)' } : {}}>
              <Icon size={14} />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px mx-1"
                   style={{ backgroundColor: i < currentIdx ? 'var(--accent)' : 'var(--border)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
