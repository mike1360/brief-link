# Brief Link — Test Cases

## TC-001: Brief Upload

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.1 | Upload PDF via file picker | Click upload area > select PDF file | File name and size displayed, upload area replaced with file card |
| 1.2 | Upload PDF via drag and drop | Drag PDF from Finder/Explorer onto upload zone | Same as 1.1 |
| 1.3 | Reject non-PDF file | Attempt to upload a .docx or .txt file | File is not accepted; only .pdf files selectable in picker |
| 1.4 | Clear uploaded brief | Upload a PDF > click X button | Upload zone returns to empty state |
| 1.5 | Replace uploaded brief | Upload PDF A > upload PDF B | PDF B shown, PDF A removed |
| 1.6 | Upload large PDF (20+ pages) | Upload a 30-page legal brief PDF | File accepted, name and size shown |
| 1.7 | Upload empty/corrupt PDF | Upload a 0-byte or corrupt PDF file | Error message shown when processing is attempted |

## TC-002: Exhibit Upload

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.1 | Upload single exhibit | Click add exhibit > select one file | File appears in exhibit list with auto-detected label |
| 2.2 | Upload multiple exhibits at once | Select multiple files in picker | All files added to list with sequential labels |
| 2.3 | Auto-detect label from filename | Upload file named "Exhibit_A.pdf" | Label auto-populated as "Exhibit A" |
| 2.4 | Auto-detect label from "Ex-B" format | Upload file named "Ex-B.pdf" | Label auto-populated as "Exhibit B" |
| 2.5 | Fallback label for generic filename | Upload file named "document.pdf" | Label auto-populated as "Exhibit [next letter]" |
| 2.6 | Edit exhibit label | Upload exhibit > edit label text field | Label updates in real time |
| 2.7 | Remove exhibit | Upload 3 exhibits > click X on middle one | Middle exhibit removed, others remain |
| 2.8 | Drag and drop exhibits | Drag files onto exhibit drop zone | Files added to list |
| 2.9 | Upload non-PDF exhibit | Upload a .jpg or .png file as exhibit | File accepted (exhibits aren't limited to PDF) |
| 2.10 | Exhibit count shown in header | Upload 5 exhibits | Header shows "Exhibits (5)" |

## TC-003: Citation Parsing

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.1 | Detect "Exhibit A" format | Process brief containing "Exhibit A" | Citation found with label "A" |
| 3.2 | Detect "Exhibit 1" format | Process brief containing "Exhibit 1" | Citation found with label "1" |
| 3.3 | Detect "Ex. A" format | Process brief containing "Ex. A" | Citation found with label "A" |
| 3.4 | Detect "Ex. 1" format | Process brief containing "Ex. 1" | Citation found with label "1" |
| 3.5 | Detect "Exh. A" format | Process brief containing "Exh. A" | Citation found with label "A" |
| 3.6 | Detect compound label "A-1" | Process brief containing "Exhibit A-1" | Citation found with label "A-1" |
| 3.7 | Detect quoted label | Process brief containing 'Exhibit "A"' | Citation found with label "A" |
| 3.8 | Detect multiple citations same exhibit | Brief references "Exhibit A" 5 times | 5 citations found, all with label "A" |
| 3.9 | Detect citations across pages | Brief with Exhibit A on p.1, Exhibit B on p.3 | Citations have correct page numbers |
| 3.10 | Detect citation with page ref | Brief contains "Ex. A at 12-14" | Citation found for "Ex. A" |
| 3.11 | Detect citation with Bates ref | Brief contains "Ex. C at VTX-000342" | Citation found for "Ex. C" |
| 3.12 | Detect compound "Exhibits A and B" | Brief contains "Exhibits A and B" | Two citations found: "A" and "B" |
| 3.13 | Case insensitive matching | Brief contains "exhibit a" (lowercase) | Citation found with label "A" |
| 3.14 | No false positives on "exhibit" as noun | Brief contains "the exhibit hall was crowded" | No citation found (no label after "exhibit") |
| 3.15 | Handle brief with no citations | Process brief with no exhibit references | Zero citations found, message shown |
| 3.16 | Multi-letter labels | Brief contains "Exhibit AA" | Citation found with label "AA" |
| 3.17 | Large exhibit numbers | Brief contains "Exhibit 101" | Citation found with label "101" |
| 3.18 | Citations sorted by position | Brief has Exhibit C then A then B | Citations returned in document order: C, A, B |

## TC-004: Auto-Mapping

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.1 | Auto-map exact label match | Upload Exhibit A file + brief citing "Exhibit A" | Citation automatically linked to exhibit |
| 4.2 | Auto-map abbreviated citation | Upload "Exhibit A" + brief citing "Ex. A" | Citation linked (both normalize to "A") |
| 4.3 | Auto-map all citations | Upload exhibits A-N + sample brief | All 14 exhibit types linked |
| 4.4 | Unlinked citation when no match | Brief cites "Exhibit Z" with no Exhibit Z uploaded | Citation shown as unlinked |
| 4.5 | Stats reflect mapping results | Process brief with 10 citations, 8 mapped | Stats: Total=10, Linked=8, Unlinked=2 |
| 4.6 | Case insensitive auto-map | Label "exhibit a" + citation "Exhibit A" | Successfully mapped |

## TC-005: Manual Mapping

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.1 | Manually link unlinked citation | Expand unlinked citation > select exhibit from dropdown | Citation moves to linked section, status updates |
| 5.2 | Override auto-mapped link | Expand linked citation > select different exhibit | Link updated to new exhibit |
| 5.3 | Unlink a citation | Expand linked citation > select "Not linked" | Citation moves to unlinked section |
| 5.4 | Context shown for citation | Expand any citation | ~60 chars before and after citation shown |
| 5.5 | Page number shown | Expand citation from page 3 | "p. 3" displayed |
| 5.6 | Dropdown shows all exhibits | Expand citation with 5 exhibits uploaded | All 5 exhibits in dropdown |

## TC-006: Brief Preview

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.1 | Full text displayed | Process brief and reach review step | Complete brief text shown in preview panel |
| 6.2 | Linked citations highlighted green | Citations mapped to exhibits | Green underline/highlight on linked citations |
| 6.3 | Unlinked citations highlighted amber | Citations not mapped | Amber/warning highlight on unlinked citations |
| 6.4 | Click linked citation opens exhibit | Click a green-highlighted citation | Exhibit file opens in new browser tab |
| 6.5 | Preview scrollable | Long brief | Scrollbar appears, content scrollable |
| 6.6 | Legend shown | Review step active | Color legend shown below preview |
| 6.7 | Preview updates after manual mapping | Change a citation mapping | Preview highlight color updates immediately |

## TC-007: Download - HTML

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.1 | Download HTML linked brief | Click "Download as HTML" | HTML file downloaded with correct filename |
| 7.2 | HTML contains clickable links | Open downloaded HTML in browser | Exhibit citations are clickable hyperlinks |
| 7.3 | HTML preserves text formatting | Open downloaded HTML | Text layout matches original brief |
| 7.4 | HTML filename derived from brief | Upload "motion_for_summary_judgment.pdf" | Download named "motion_for_summary_judgment_linked.html" |
| 7.5 | Only linked citations become links | Brief with linked and unlinked citations | Only linked citations are hyperlinks in HTML |
| 7.6 | HTML header shows metadata | Open downloaded HTML | Header shows filename and link count |

## TC-008: Download - PDF

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 8.1 | Download PDF linked brief | Click "Download as PDF" (when available) | PDF file downloaded |
| 8.2 | PDF contains link annotations | Open PDF in Adobe/Preview | Click citation opens exhibit |
| 8.3 | PDF preserves original layout | Compare original and linked PDF | Layout identical except for link annotations |
| 8.4 | Graceful fallback on PDF failure | PDF generation fails | HTML option still available, no crash |

## TC-009: Workflow & Navigation

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 9.1 | Step indicator shows Upload | Load app fresh | Upload step highlighted |
| 9.2 | Step indicator shows Processing | Click "Scan for Citations" | Processing step highlighted, spinner shown |
| 9.3 | Step indicator shows Review | Processing completes | Review step highlighted |
| 9.4 | Step indicator shows Download | Click "Generate Linked Brief" | Download step highlighted |
| 9.5 | Start Over returns to Upload | Click "Start Over" from Review | All state cleared, Upload step shown |
| 9.6 | Process Another returns to Upload | Click "Process Another Brief" from Download | All state cleared, Upload step shown |
| 9.7 | Scan button disabled without files | No brief or exhibits uploaded | "Scan for Citations" button disabled |
| 9.8 | Generate button disabled without links | No citations linked | "Generate Linked Brief" button disabled |

## TC-010: Dark Mode

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 10.1 | Toggle to dark mode | Click moon icon | Background changes to dark palette |
| 10.2 | Toggle back to light mode | Click sun icon in dark mode | Background changes to light palette |
| 10.3 | All components respect theme | Toggle dark mode in review step | Cards, text, citations all use dark colors |

## TC-011: Error Handling

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 11.1 | Corrupt PDF error | Upload corrupt/empty PDF > process | Error banner shown with readable message |
| 11.2 | Password-protected PDF | Upload encrypted PDF > process | Error message about unsupported file |
| 11.3 | Scanned PDF (image-only) | Upload scanned PDF with no text layer | Zero citations found, informational message |
| 11.4 | Error doesn't lose data | Error during processing | Exhibits remain uploaded, can retry |

## TC-012: Performance

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 12.1 | Small brief (<5 pages) | Process 3-page brief | Completes in under 3 seconds |
| 12.2 | Medium brief (10-20 pages) | Process 15-page brief | Completes in under 7 seconds |
| 12.3 | Large brief (30+ pages) | Process 35-page brief | Completes in under 15 seconds |
| 12.4 | Many exhibits (15+) | Upload 20 exhibit files | UI remains responsive |
| 12.5 | Many citations (50+) | Brief with 50+ exhibit references | Review list renders smoothly |

## TC-013: Security & Privacy

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 13.1 | No network requests during processing | Monitor Network tab > process brief | Zero outbound requests (all client-side) |
| 13.2 | Files not stored after session | Process brief > close tab > reopen | No data persists |
| 13.3 | Object URLs revoked on reset | Process brief > Start Over | Browser memory freed |

## TC-014: Sample Data Validation

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 14.1 | Sample brief loads correctly | Upload sample-brief.pdf | Text extracted successfully |
| 14.2 | All 14 exhibits detected | Process sample brief | Citations found for Exhibits A through N |
| 14.3 | All exhibits auto-map | Upload 14 sample exhibit files + brief | 100% auto-map rate |
| 14.4 | Citation count matches expected | Process sample brief | 30+ citations found across all formats |
| 14.5 | HTML output contains all links | Download HTML > count links | All linked citations are clickable |

---

**Total Test Cases: 85**
**Coverage: Upload, Parsing, Mapping, Preview, Download, Workflow, Theme, Errors, Performance, Security, Sample Data**
