# Real-World Test Briefs

Publicly-filed briefs for integration testing. All PDFs are from free/public sources (FTC.gov, CourtListener RECAP). No PACER charges incurred.

## ftc-amazon/

**Case:** FTC v. Amazon.com, Inc., No. 2:23-cv-00932-JHC (W.D. Wash., filed 2023-06-21)
**Docket:** https://www.courtlistener.com/docket/67515622/federal-trade-commission-v-amazoncom-inc/

- `complaint.pdf` — 87-page redacted complaint (main brief)
- `attachment-1.pdf` through `attachment-22.pdf` — exhibits A–V

**Citation patterns to test:** `Attachment A`, `Att. A`, `Attachments A through V` (~116 occurrences)

**Note:** Most 45 KB attachments are 1-page "FILED UNDER SEAL" placeholders. Attachments 15, 17–22 are the unredacted substantive exhibits (MB-scale).

## Re-download

```bash
cd ~/repos/brief-link/sample-data/real-world/ftc-amazon
curl -L -o complaint.pdf "https://storage.courtlistener.com/recap/gov.uscourts.wawd.323520/gov.uscourts.wawd.323520.1.0.pdf"
BASE="https://storage.courtlistener.com/recap/gov.uscourts.wawd.323520/gov.uscourts.wawd.323520"
for i in $(seq 1 22); do curl -L -o "attachment-${i}.pdf" "${BASE}.1.${i}.pdf"; done
```
