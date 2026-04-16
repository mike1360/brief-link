# Brief Link — Requirements Specification

**Product:** Brief Link — Exhibit Hyperlinking Service
**Version:** 1.0 (POC)
**Date:** April 15, 2026
**Jira Epic:** [TBD]
**Requested by:** Shelly (via Jim Curry, Partner, Loeb & Loeb LLP)
**Product Owner:** Mike Murray

---

## Background

Loeb & Loeb partner Jim Curry has requested a service where the firm can send Veritext a multi-page brief, and Veritext will embed hyperlinks to exhibits wherever an exhibit is cited in the brief. This tool automates that process.

## Product Vision

Brief Link is a browser-based tool that allows litigation support teams to upload a legal brief (PDF), upload the corresponding exhibit files, and automatically generate a hyperlinked version of the brief where every exhibit citation is a clickable link to the actual exhibit document.

## Key Workflow

1. **Upload** — User uploads the brief PDF and exhibit files
2. **Process** — System extracts text and identifies all exhibit citations
3. **Review** — User reviews detected citations, verifies/corrects mappings
4. **Download** — User downloads the linked brief (HTML or PDF)

## Functional Requirements

### FR-1: Brief Upload
- Accept PDF files via drag-and-drop or file picker
- Display file metadata (name, size)
- Support files up to 50MB
- Client-side processing only (no server upload)

### FR-2: Exhibit Upload
- Accept multiple files simultaneously
- Support PDF, DOCX, JPG, PNG, TIFF formats
- Auto-detect exhibit labels from filenames
- Allow manual label editing
- Support adding/removing exhibits

### FR-3: Citation Detection
- Detect standard citation formats:
  - `Exhibit A` / `Exhibit 1` (full form)
  - `Ex. A` / `Ex. 1` (abbreviated)
  - `Exh. A` / `Exh. 1` (alternate abbreviation)
  - `Exhibit A-1` (compound labels)
  - `Exhibit "A"` (quoted labels)
  - `Exhibits A and B` (compound references)
- Extract page numbers for each citation
- Handle case-insensitive matching
- Sort citations by document position

### FR-4: Auto-Mapping
- Automatically match citations to exhibits by normalized label
- Show mapping statistics (total, linked, unlinked)
- Handle label variations consistently

### FR-5: Manual Mapping
- Allow manual exhibit assignment via dropdown
- Allow overriding auto-mapped links
- Allow unlinking citations
- Show surrounding context for verification

### FR-6: Brief Preview
- Display full brief text with highlighted citations
- Color-code by status (green=linked, amber=unlinked)
- Linked citations clickable to open exhibit
- Scrollable for long documents

### FR-7: Output Generation
- **HTML output (primary):** Downloadable HTML with embedded hyperlinks
- **PDF output (secondary):** Modified PDF with URI link annotations
- Filename derived from original brief name
- Include metadata header in output

## Non-Functional Requirements

### NFR-1: Performance
- Process a 30-page brief in under 15 seconds
- UI remains responsive during processing

### NFR-2: Security
- All processing client-side (no server upload of documents)
- No document content transmitted externally
- Object URLs revoked when no longer needed

### NFR-3: Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design (desktop primary, tablet secondary)

### NFR-4: Branding
- Veritext brand colors and design system
- Light and dark mode support

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite 6
- **Styling:** Tailwind CSS 3 (Veritext theme variables)
- **PDF Read:** pdfjs-dist (text extraction)
- **PDF Write:** pdf-lib (link annotations)
- **Icons:** Lucide React
- **Routing:** React Router v7
- **Deploy:** Vercel
- **Testing:** Vitest + React Testing Library

## Future Considerations (V2)

- Server-side processing for larger documents
- OCR support for scanned PDFs
- Batch processing (multiple briefs)
- Hosted exhibit storage with persistent URLs
- Integration with document management systems
- Word document (DOCX) input support
- Exhibit bookmarking within PDFs
- API for programmatic access
- Client portal for direct upload by law firms
