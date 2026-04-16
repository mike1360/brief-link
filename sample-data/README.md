# Brief Link — Sample Test Data

This directory contains sample data for testing the Brief Link application.

## Files

### `sample-brief.txt`
A realistic multi-page legal brief (Plaintiff's Memorandum of Law in Support of Motion for Summary Judgment) that references **14 exhibits (A through N)**. The brief uses a variety of citation formats to test the parser:

- Full form: `Exhibit A`, `Exhibit B`, `Exhibit G`
- Abbreviated: `Ex. A`, `Ex. B`, `Ex. C`, `Ex. D`
- Alternate abbreviated: `Exh. G`
- With page references: `Ex. A at 12-14`, `Exhibit G at 15-22`, `Ex. K at 14`
- With Bates numbers: `Ex. C at VTX-000342-43`
- Compound: `Exhibits G and H`, `Exhibits M and N`

### Exhibit Files for Testing

To fully test the app, create simple PDF files for each exhibit. You can use any PDF generator or simply create text files and convert them:

| File Name | Exhibit Label | Description |
|-----------|---------------|-------------|
| `Exhibit_A.pdf` | Exhibit A | Stock Purchase Agreement |
| `Exhibit_B.pdf` | Exhibit B | Indemnification Agreement |
| `Exhibit_C.pdf` | Exhibit C | Internal emails (discovery production) |
| `Exhibit_D.pdf` | Exhibit D | Audited financial statements FY2022 |
| `Exhibit_E.pdf` | Exhibit E | Baker & Whitfield due diligence report |
| `Exhibit_F.pdf` | Exhibit F | Closing Certificate |
| `Exhibit_G.pdf` | Exhibit G | Expert Report of Dr. Sarah Chen |
| `Exhibit_H.pdf` | Exhibit H | Corrected financial statements |
| `Exhibit_I.pdf` | Exhibit I | Notice of Claim |
| `Exhibit_J.pdf` | Exhibit J | Defendants' Response Letter |
| `Exhibit_K.pdf` | Exhibit K | Expert Report of Dr. James Whitmore |
| `Exhibit_L.pdf` | Exhibit L | Summary of Damages Calculation |
| `Exhibit_M.pdf` | Exhibit M | Baker & Whitfield invoices |
| `Exhibit_N.pdf` | Exhibit N | Internal cost records |

### Quick Test PDF Generation

Run this script to generate placeholder exhibit PDFs (requires Python 3):

```bash
cd sample-data
python3 generate_exhibits.py
```

Or convert the text brief to PDF:

```bash
# macOS
cupsfilter sample-brief.txt > sample-brief.pdf 2>/dev/null

# Or use any PDF printer / converter
```

## Expected Results

When running the sample brief through Brief Link with all 14 exhibits loaded:

- **Total citations detected**: ~40+ (varies by parser sensitivity)
- **Unique exhibits referenced**: 14 (A through N)
- **Auto-map success rate**: 100% (when exhibit labels match standard format)
- **Citation formats covered**: Full, abbreviated, with page refs, with Bates refs, compound
