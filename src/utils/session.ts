import type { Citation, ExhibitFile } from './types'

/**
 * Session snapshot written to disk so a paralegal can stop mid-review and
 * resume later (or hand off to a colleague). Binary file contents are never
 * stored — the user must re-upload the brief and exhibits, and we match
 * exhibits by filename to restore their labels, sealed flags, and mappings.
 */
export interface Session {
  version: 1
  savedAt: string // ISO timestamp
  briefFileName: string
  exhibits: {
    id: string          // original runtime id (used only to match citations)
    label: string
    fileName: string
    sealed?: boolean
  }[]
  citations: Citation[]
}

export function buildSession(args: {
  briefFileName: string
  exhibits: ExhibitFile[]
  citations: Citation[]
}): Session {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    briefFileName: args.briefFileName,
    exhibits: args.exhibits.map(e => ({
      id: e.id,
      label: e.label,
      fileName: e.file.name,
      sealed: e.sealed,
    })),
    citations: args.citations,
  }
}

export function downloadSession(session: Session): void {
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = session.briefFileName.replace(/\.(pdf|docx?)$/i, '') + '_session.json'
  a.click()
  URL.revokeObjectURL(url)
}

export async function readSessionFile(file: File): Promise<Session> {
  const text = await file.text()
  const parsed = JSON.parse(text)
  if (parsed?.version !== 1) {
    throw new Error(`Unsupported session version: ${parsed?.version}`)
  }
  if (!Array.isArray(parsed.exhibits) || !Array.isArray(parsed.citations)) {
    throw new Error('Session file is missing required fields.')
  }
  return parsed as Session
}

/**
 * Restore a session against the currently-uploaded exhibits.
 * Exhibits are matched by filename (case-insensitive). Citation exhibitIds
 * are rewritten to point at the new runtime exhibit ids.
 */
export function restoreSession(
  session: Session,
  uploadedExhibits: ExhibitFile[],
): {
  exhibits: ExhibitFile[]
  citations: Citation[]
  missing: string[] // filenames from session that weren't matched
} {
  const uploadedByName = new Map<string, ExhibitFile>()
  for (const ex of uploadedExhibits) {
    uploadedByName.set(ex.file.name.toLowerCase(), ex)
  }

  // Map session exhibit id -> new runtime exhibit id, and update labels/sealed
  // on the uploaded exhibits to match the session.
  const idMap = new Map<string, string>()
  const missing: string[] = []
  const restoredExhibits: ExhibitFile[] = uploadedExhibits.map(ex => ({ ...ex }))

  for (const sessEx of session.exhibits) {
    const match = uploadedByName.get(sessEx.fileName.toLowerCase())
    if (!match) {
      missing.push(sessEx.fileName)
      continue
    }
    idMap.set(sessEx.id, match.id)
    const target = restoredExhibits.find(e => e.id === match.id)
    if (target) {
      target.label = sessEx.label
      target.sealed = sessEx.sealed
    }
  }

  const restoredCitations: Citation[] = session.citations.map(c => ({
    ...c,
    exhibitId: c.exhibitId ? idMap.get(c.exhibitId) : undefined,
  }))

  return { exhibits: restoredExhibits, citations: restoredCitations, missing }
}
