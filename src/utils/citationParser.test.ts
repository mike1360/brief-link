import { describe, it, expect, beforeEach } from 'vitest'
import { parseCitations, normalizeLabel, autoMapCitations, resetIdCounter } from './citationParser'
import type { PageText } from './types'

beforeEach(() => {
  resetIdCounter()
})

function makePages(text: string): PageText[] {
  return [{ pageNumber: 1, text, startOffset: 0 }]
}

describe('normalizeLabel', () => {
  it('uppercases and trims', () => {
    expect(normalizeLabel('a')).toBe('A')
    expect(normalizeLabel(' B ')).toBe('B')
    expect(normalizeLabel('"C"')).toBe('C')
  })

  it('handles compound labels', () => {
    expect(normalizeLabel('A-1')).toBe('A-1')
  })
})

describe('parseCitations', () => {
  it('finds "Exhibit A" format', () => {
    const result = parseCitations(makePages('See Exhibit A for details.'))
    expect(result.citations).toHaveLength(1)
    expect(result.citations[0].text).toBe('Exhibit A')
    expect(result.citations[0].normalizedLabel).toBe('A')
  })

  it('finds "Ex. A" format', () => {
    const result = parseCitations(makePages('Refer to Ex. B at page 5.'))
    expect(result.citations).toHaveLength(1)
    expect(result.citations[0].text).toBe('Ex. B')
    expect(result.citations[0].normalizedLabel).toBe('B')
  })

  it('finds "Exh. A" format', () => {
    const result = parseCitations(makePages('As shown in Exh. C.'))
    expect(result.citations).toHaveLength(1)
    expect(result.citations[0].normalizedLabel).toBe('C')
  })

  it('finds numbered exhibits', () => {
    const result = parseCitations(makePages('Exhibit 1 shows revenue. See also Ex. 2.'))
    expect(result.citations).toHaveLength(2)
    expect(result.citations[0].normalizedLabel).toBe('1')
    expect(result.citations[1].normalizedLabel).toBe('2')
  })

  it('finds compound labels like A-1', () => {
    const result = parseCitations(makePages('See Exhibit A-1 and Ex. B-2.'))
    expect(result.citations).toHaveLength(2)
    expect(result.citations[0].normalizedLabel).toBe('A-1')
    expect(result.citations[1].normalizedLabel).toBe('B-2')
  })

  it('finds multiple citations in one text', () => {
    const text = 'The SPA (Exhibit A) and the Indemnification Agreement (Exhibit B) were executed. See also Ex. C at page 3.'
    const result = parseCitations(makePages(text))
    expect(result.citations.length).toBeGreaterThanOrEqual(3)
    const labels = result.citations.map(c => c.normalizedLabel)
    expect(labels).toContain('A')
    expect(labels).toContain('B')
    expect(labels).toContain('C')
  })

  it('handles quoted exhibit labels', () => {
    const result = parseCitations(makePages('attached as Exhibit "A"'))
    expect(result.citations).toHaveLength(1)
    expect(result.citations[0].normalizedLabel).toBe('A')
  })

  it('assigns correct page numbers across pages', () => {
    const pages: PageText[] = [
      { pageNumber: 1, text: 'Page one has Exhibit A. ', startOffset: 0 },
      { pageNumber: 2, text: 'Page two has Exhibit B. ', startOffset: 24 },
    ]
    const result = parseCitations(pages)
    expect(result.citations).toHaveLength(2)
    expect(result.citations[0].pageNumber).toBe(1)
    expect(result.citations[1].pageNumber).toBe(2)
  })

  it('returns citations sorted by position', () => {
    const text = 'Exhibit C then Exhibit A then Exhibit B'
    const result = parseCitations(makePages(text))
    const positions = result.citations.map(c => c.startIndex)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('returns empty for text with no citations', () => {
    const result = parseCitations(makePages('This brief contains no exhibit references.'))
    expect(result.citations).toHaveLength(0)
  })

  it('handles the sample brief with many citation formats', () => {
    const text = `attached hereto as Exhibit A, and the related Indemnification Agreement, attached hereto as Exhibit B. Internal emails (Exhibit C) and the audited financial statements (Exhibit D). Greenfield and Meridian executed the SPA (Ex. A). Section 4.5 of the SPA (Ex. A at 12-14). The Indemnification Agreement (Ex. B). Due diligence report (Exhibit E). Closing Certificate (Exhibit F). See Expert Report (Exhibit G) at 15-22. Exh. G at 23-27. Corrected statements (Exhibit H). Ex. D shows revenue. Notice of Claim (Exhibit I). Response Letter (Exhibit J). Damages report (Exhibit K) at 8-14. See Ex. K at 14. Damages Calculation (Exhibit L). Invoices (Exhibits M and N).`
    const result = parseCitations(makePages(text))

    const uniqueLabels = new Set(result.citations.map(c => c.normalizedLabel))
    // Should find citations for A through N (14 unique exhibits)
    for (const label of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']) {
      expect(uniqueLabels).toContain(label)
    }
    expect(result.citations.length).toBeGreaterThanOrEqual(14)
  })
})

describe('autoMapCitations', () => {
  it('maps citations to matching exhibits', () => {
    const result = parseCitations(makePages('See Exhibit A and Exhibit B.'))
    const labelMap = new Map([['A', 'ex-1'], ['B', 'ex-2']])
    const count = autoMapCitations(result.citations, labelMap)
    expect(count).toBe(2)
    expect(result.citations[0].exhibitId).toBe('ex-1')
    expect(result.citations[1].exhibitId).toBe('ex-2')
  })

  it('leaves unmapped citations without exhibitId', () => {
    const result = parseCitations(makePages('See Exhibit A and Exhibit Z.'))
    const labelMap = new Map([['A', 'ex-1']])
    autoMapCitations(result.citations, labelMap)
    const mapped = result.citations.filter(c => c.exhibitId)
    const unmapped = result.citations.filter(c => !c.exhibitId)
    expect(mapped).toHaveLength(1)
    expect(unmapped).toHaveLength(1)
  })

  it('returns count of mapped citations', () => {
    const result = parseCitations(makePages('Ex. A, Ex. B, Ex. C'))
    const labelMap = new Map([['A', 'ex-1'], ['C', 'ex-3']])
    const count = autoMapCitations(result.citations, labelMap)
    expect(count).toBe(2)
  })
})
