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

## Governing Authorities

The closest thing to a national standard is the federal [Attorney Guide to Hyperlinking in the Federal Courts](https://www.cacd.uscourts.gov/sites/default/files/documents/Hyperlinking_Attorneys_Word.pdf) (maintained by D. Neb., reissued by many districts; Feb. 22, 2022 rev.). There is no AO-of-US-Courts, NCSC, or Sedona Conference national standard on hyperlinking as of 2026.

### State rules (priority jurisdictions)

| State | Status | Authority | Key constraints |
| --- | --- | --- | --- |
| **California** | Encouraged | [Cal. R. Ct. 8.74](https://courts.ca.gov/cms/rules/index/eight/rule8_74); Rule 8.204 | Links must be active at filing. Electronic bookmarks required for each exhibit (letter/number + brief description). |
| **New York (Commercial Division)** | **Mandatory** | [AO/133/20](https://www.nycourts.gov/LegacyPDFS/RULES/comments/PDF/hyperlinking.pdf) (9/29/2020); ComDiv Rule 6 | Every citation to a prior NYSCEF filing *must* hyperlink to the NYSCEF docket entry. No links to sealed docs. Hardship waiver available. |
| **New York (other courts)** | Optional | NYSCEF rules | Each exhibit as separate PDF/A with descriptive metadata. |
| **Texas** | Recommended | [TX Guide to Creating Electronic Appellate Briefs (2019)](https://www.txcourts.gov/media/1443805/guide-to-creating-electronic-appellate-briefs-2019-adobe-acrobat-pro-dc.pdf) | Bookmarks required for every brief section and record cite. TAMES system also auto-inserts Westlaw links to cases/statutes. |
| **Florida** | No statewide rule | [Fla. R. Jud. Admin. 2.525 / 2.526](https://flcourts-media.flcourts.gov/content/download/219089/file/RULE-2-525-Jan2014_v2.pdf); [FL Courts Technology Standards](https://supremecourt.flcourts.gov/Practice-Procedures/Accessible-Court-Filings) | Searchable PDFs required; links if used must be active and fully-qualified. |
| **Illinois** | Allowed, not part of record | [IL Record on Appeal Standards (2022)](https://efile.illinoiscourts.gov/wp-content/uploads/2022/10/IL-Record-on-Appeal-Standards.pdf); Ill. S. Ct. R. 341–343 | "External material behind the link is not considered part of the filing." Hyperlinked TOC required in Record on Appeal. |

Cross-jurisdiction compilation (secondary): [TypeLaw's Guide to Citation Hyperlinking Requirements](https://www.typelaw.com/blog/a-guide-to-citation-hyperlinking-requirements-in-state-and-federal-courts/).

### Cross-cutting rules (all jurisdictions surveyed)

1. **Links supplement, never replace, the citation text.** Always preserve "Ex. A" as visible text; hyperlinks are overlay only.
2. **Never "Print to PDF"** — it flattens hyperlinks. Use Word's "Save As PDF" or Acrobat "Create PDF." Product must detect flattened input and warn.
3. **Exhibits must still be filed of record.** Links point *into* the filed record (NYSCEF entry, appellate appendix, CM/ECF attachment), never to substitute external storage.
4. **Sealed exhibits** — no outbound link. Need an explicit "sealed" flag per exhibit.
5. **Page-specific deep links** — federal guide uses `?page=N` URL suffix (CM/ECF); internal-PDF equivalent is a GoTo action to a specific page.
6. **Bookmark panel** — CA Rule 8.74 and TX guide require per-exhibit bookmarks in addition to inline links.

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
  - `Attachment A` / `Att. A` (federal complaints — FTC v. Amazon pattern)
  - `Ex. B at 12` / `Exhibit 5 at p. 3` (pin-cites for page-specific linking)
- Extract page numbers for each citation (for pin-cite support)
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
- **Bundled PDF (primary):** Single self-contained PDF = original brief pages + exhibit index page + all exhibits appended, with internal GoTo links on citations and a bookmark panel entry per exhibit
- **Pin-cite deep links:** citations with a page ref (`Ex. B at 12`) link to page 12 *within* the bundled exhibit
- **HTML output (optional):** Browser-viewable HTML with embedded hyperlinks
- Filename derived from original brief name
- Preserve original citation text — hyperlink is an overlay, not a replacement
- Include metadata header in output

### FR-8: Compliance Guardrails
- **Sealed flag per exhibit** — when enabled, citation still highlighted but no link emitted (NY ComDiv compliance)
- **Flattened-PDF detection** — warn if uploaded brief has no extractable text (likely a Print-to-PDF or scan)
- **Citation preservation check** — output must contain the original citation text string for every detected citation

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

- **NYSCEF Commercial Division mode** — emit hyperlinks pointing to NYSCEF docket entries (not bundled PDF) to satisfy AO/133/20
- **CM/ECF mode** — emit `https://ecf.<dist>.uscourts.gov/doc1/<docid>?page=N` URLs per federal guide
- **Automated case-law linking** — Westlaw/Lexis-style citation detection with jump-links (see federal guide §"Automated Links to Legal Citations")
- Server-side processing for larger documents
- OCR support for scanned PDFs
- Batch processing (multiple briefs)
- Hosted exhibit storage with persistent URLs
- Integration with document management systems
- Word document (DOCX) input support
- API for programmatic access
- Client portal for direct upload by law firms

## Test Data

Real-world sample briefs in `sample-data/real-world/`:

- **FTC v. Amazon** (W.D. Wash. 2:23-cv-00932, 2023-06-21) — 87-pg complaint + 22 attachments. Exercises "Attachment A/Att. A" pattern, ~116 citations. Primary integration test.
- **Democracy Forward v. CFPB** (D. Mass. 1:20-cv-11141, MSJ 2021-08-20) — 28-pg brief with "Exhibit A-D" alphabetic labels. 44+ citations.
- **CFPB v. PGx Holdings** (D. Utah 2:19-cv-00298, MSJ order 2023-03) — mixed-format labels ("Ex. 5", "Ex. 12", "Ex. F5"). Parser stress test.
