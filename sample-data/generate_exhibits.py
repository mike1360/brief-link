#!/usr/bin/env python3
"""Generate placeholder exhibit PDFs for testing Brief Link."""

import os

EXHIBITS = {
    "A": "STOCK PURCHASE AGREEMENT\n\nThis Stock Purchase Agreement (the \"Agreement\") is entered into as of March 15, 2023,\nby and between Greenfield Capital Partners, LLC (\"Buyer\") and Meridian Holdings, Inc.\n(\"Company\") and David R. Thornton (\"Seller\").\n\nSection 4.5 - Financial Statements\nSeller represents and warrants that the Financial Statements (a) were prepared in\naccordance with GAAP, (b) fairly present the financial condition of the Company...\n\n[Pages 12-14: Detailed representations and warranties]\n[Page 28-30: Section 8.2 - Notice of Claims]\n[Page 35: Section 9.3 - Attorneys' Fees]",

    "B": "INDEMNIFICATION AGREEMENT\n\nThis Indemnification Agreement is entered into concurrently with the Stock Purchase\nAgreement dated March 15, 2023.\n\nSection 2.1 - Indemnification Obligation\nThe Indemnitor shall hold harmless and indemnify Greenfield Capital Partners, LLC\nfrom and against any and all Losses arising from any breach of any representation,\nwarranty, or covenant contained in the SPA.\n\n[Pages 3-4: Personal guarantee provisions]",

    "C": "INTERNAL EMAIL CORRESPONDENCE\nProduced in Discovery\n\n--- VTX-000342 ---\nFrom: Rachel Morrison <rmorrison@meridian.com>\nTo: David Thornton <dthornton@meridian.com>\nDate: January 10, 2023\nSubject: Q4 Numbers\n\nDavid,\nThe Q4 numbers are aggressive. If the auditors dig into the Apex and Bridgewater\nreceivables, we could have a problem.\n— Rachel\n\n--- VTX-000343 ---\nFrom: David Thornton <dthornton@meridian.com>\nTo: Rachel Morrison <rmorrison@meridian.com>\nDate: January 10, 2023\nSubject: RE: Q4 Numbers\n\nKeep it tight. The deal needs to close.\n— DT",

    "D": "MERIDIAN HOLDINGS, INC.\nAUDITED FINANCIAL STATEMENTS\nFor the Fiscal Year Ended December 31, 2022\n\nConsolidated Statement of Income\n\nRevenue:                    $52,800,000\nCost of Goods Sold:         $28,400,000\nGross Profit:               $24,400,000\nOperating Expenses:          $6,000,000\nEBITDA:                     $18,400,000\nDepreciation & Amort:        $2,100,000\nOperating Income:           $16,300,000\n\nPrepared by: Morrison & Associates CPAs",

    "E": "BAKER & WHITFIELD LLP\nDUE DILIGENCE REPORT\n\nDate: February 28, 2023\nRe: Proposed Acquisition of Meridian Holdings, Inc.\nPrepared for: Greenfield Capital Partners, LLC\n\nExecutive Summary:\nWe have conducted financial due diligence on Meridian Holdings, Inc.\n\nFindings:\n- Accounts receivable show certain discrepancies in aging schedules\n- Discrepancies are within an acceptable range\n- Revenue recognition practices appear consistent with industry norms\n- Recommend standard post-closing audit provisions",

    "F": "CLOSING CERTIFICATE\n\nDate: April 30, 2023\n\nI, David R. Thornton, hereby certify that:\n\n1. All representations and warranties contained in the Stock Purchase Agreement\n   dated March 15, 2023 remain true and correct as of the date hereof.\n\n2. All covenants and conditions to be performed prior to closing have been\n   satisfied.\n\n3. No material adverse change has occurred since the date of the Agreement.\n\nSigned: David R. Thornton\nTitle: Sole Shareholder, Meridian Holdings, Inc.",

    "G": "EXPERT REPORT OF DR. SARAH CHEN, CPA, CFF\n\nPrepared for: Walker, Pratt & Associates LLP\nDate: November 15, 2024\n\n[Pages 15-22: Analysis of Channel Stuffing Practices]\nMeridian engaged in systematic channel stuffing by recording revenue on\ntransactions that had not been finalized. Key instances include:\n- Apex Technologies: $3.2M in premature revenue recognition\n- Bridgewater Systems: $2.8M in accelerated bookings\n- Cascade Networks: $2.3M in bill-and-hold arrangements\n\n[Pages 23-27: Revenue Overstatement Analysis]\nTotal Revenue Overstatement: $8,300,000\nReported Revenue:  $52,800,000\nActual Revenue:    $44,500,000\n\nCorrected EBITDA:  $12,100,000 (vs. reported $18,400,000)",

    "H": "CORRECTED FINANCIAL STATEMENTS\nPrepared by Dr. Sarah Chen, CPA\n\nMERIDIAN HOLDINGS, INC.\nCorrected Consolidated Statement of Income\nFor the Fiscal Year Ended December 31, 2022\n\nRevenue (corrected):        $44,500,000\nCost of Goods Sold:         $26,800,000\nGross Profit:               $17,700,000\nOperating Expenses:          $5,600,000\nCorrected EBITDA:           $12,100,000\nDepreciation & Amort:        $2,100,000\nOperating Income:           $10,000,000",

    "I": "NOTICE OF CLAIM\n\nDate: September 15, 2023\nVia Certified Mail and Email\n\nTo: Meridian Holdings, Inc.\n    David R. Thornton\n\nRe: Notice of Claim Pursuant to Section 8.2 of Stock Purchase Agreement\n    dated March 15, 2023\n\nDear Mr. Thornton:\n\nPlease be advised that Greenfield Capital Partners, LLC hereby provides\nnotice of its claim for indemnification in the amount of $15,200,000\narising from breaches of representations and warranties...",

    "J": "RESPONSE TO NOTICE OF CLAIM\n\nDate: October 1, 2023\nVia Certified Mail\n\nTo: Greenfield Capital Partners, LLC\n    c/o Walker, Pratt & Associates LLP\n\nRe: Response to Notice of Claim dated September 15, 2023\n\nDear Counsel:\n\nOn behalf of Meridian Holdings, Inc. and David R. Thornton, we hereby\ndeny all liability asserted in your Notice of Claim. The financial\nstatements provided were accurate and prepared in accordance with GAAP...",

    "K": "EXPERT REPORT OF DR. JAMES WHITMORE\nDamages Analysis\n\nPrepared for: Walker, Pratt & Associates LLP\nDate: December 1, 2024\n\n[Pages 8-14: Damages Calculation]\n\nCategory 1: Overpayment due to inflated financials\n  Overstated EBITDA impact on valuation:         $8,300,000\n\nCategory 2: Lost business opportunities\n  Diverted resources and missed acquisitions:     $4,100,000\n\nCategory 3: Investigation and remediation costs\n  Forensic accounting, legal, internal:           $2,800,000\n\nTOTAL DAMAGES:                                  $15,200,000",

    "L": "SUMMARY OF DAMAGES CALCULATION\n\nGreenfield Capital Partners, LLC v. Meridian Holdings, Inc.\nCase No. 24-CV-08172\n\n| Category | Amount |\n|----------|--------|\n| Overpayment (inflated financials) | $8,300,000 |\n| Lost business opportunities | $4,100,000 |\n| Investigation & remediation | $2,800,000 |\n| TOTAL | $15,200,000 |",

    "M": "BAKER & WHITFIELD LLP\nINVOICE SUMMARY\n\nClient: Greenfield Capital Partners, LLC\nMatter: Meridian Holdings Investigation\n\nInvoice Date | Description | Amount\n08/15/2023 | Forensic accounting - initial review | $185,000\n09/30/2023 | Forensic accounting - detailed analysis | $340,000\n11/15/2023 | Expert witness preparation | $275,000\n01/15/2024 | Supplemental analysis | $120,000\n\nTotal Professional Fees: $920,000",

    "N": "GREENFIELD CAPITAL PARTNERS, LLC\nINTERNAL COST RECORDS\n\nMeridian Holdings Investigation — Internal Costs\n\nPersonnel time (investigation team): $480,000\nIT forensics and data recovery: $210,000\nTravel and related expenses: $85,000\nInsurance and bonding: $145,000\nManagement overhead allocation: $960,000\n\nTotal Internal Costs: $1,880,000\n\nCombined with Baker & Whitfield fees ($920,000):\nTotal Investigation & Remediation: $2,800,000"
}


def generate_text_files():
    """Generate simple text exhibit files (can be converted to PDF separately)."""
    os.makedirs("exhibits", exist_ok=True)

    for label, content in EXHIBITS.items():
        filename = f"exhibits/Exhibit_{label}.txt"
        header = f"{'=' * 60}\nEXHIBIT {label}\n{'=' * 60}\n\n"
        with open(filename, "w") as f:
            f.write(header + content)
        print(f"Created {filename}")

    print(f"\nGenerated {len(EXHIBITS)} exhibit files in ./exhibits/")
    print("\nTo convert to PDF on macOS:")
    print("  for f in exhibits/*.txt; do cupsfilter \"$f\" > \"${f%.txt}.pdf\" 2>/dev/null; done")
    print("\nOr use any text-to-PDF converter of your choice.")


if __name__ == "__main__":
    generate_text_files()
