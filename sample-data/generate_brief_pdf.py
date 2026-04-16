#!/usr/bin/env python3
"""Generate a realistic-looking legal brief PDF for testing Brief Link."""

from fpdf import FPDF

class LegalBrief(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=30)
        self.set_margins(25, 25, 25)  # ~1-inch margins in mm

    def header(self):
        if self.page_no() > 1:
            self.set_font('Times', 'I', 10)
            self.set_text_color(100, 100, 100)
            self.cell(0, 10, f'Case No. 24-CV-08172 (LAK)', align='R')
            self.ln(8)

    def footer(self):
        self.set_y(-54)
        self.set_font('Times', 'I', 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, str(self.page_no()), align='C')

    def centered_text(self, text, size=12, style='', spacing=6):
        self.set_font('Times', style, size)
        self.cell(0, spacing, text, align='C', new_x='LMARGIN', new_y='NEXT')

    def left_text(self, text, size=12, style='', spacing=7, indent=0):
        self.set_font('Times', style, size)
        if indent:
            self.set_x(self.l_margin + indent)
        self.multi_cell(0, spacing, text, new_x='LMARGIN', new_y='NEXT')

    def separator(self):
        y = self.get_y()
        self.set_draw_color(0, 0, 0)
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.ln(4)

    def double_separator(self):
        y = self.get_y()
        self.set_draw_color(0, 0, 0)
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.line(self.l_margin, y + 2, self.w - self.r_margin, y + 2)
        self.ln(6)


def build_brief():
    pdf = LegalBrief()
    pdf.set_text_color(0, 0, 0)

    # ── Page 1: Caption ──────────────────────────────────────────
    pdf.add_page()

    pdf.centered_text('UNITED STATES DISTRICT COURT', 13, 'B', 7)
    pdf.centered_text('SOUTHERN DISTRICT OF NEW YORK', 13, 'B', 7)
    pdf.ln(8)
    pdf.double_separator()

    # Parties block
    pdf.left_text('GREENFIELD CAPITAL PARTNERS, LLC,', 12, 'B')
    pdf.ln(3)
    pdf.left_text('Plaintiff,', 12, '', 6, 30)
    pdf.ln(3)

    # vs line with case number
    pdf.set_font('Times', '', 12)
    x_start = pdf.l_margin + 36
    pdf.set_x(x_start)
    pdf.cell(80, 6, 'v.', align='L')
    pdf.cell(0, 6, 'Case No. 24-CV-08172 (LAK)', align='R', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(3)

    pdf.left_text('MERIDIAN HOLDINGS, INC., and', 12, 'B')
    pdf.left_text('DAVID R. THORNTON, individually,', 12, 'B')
    pdf.ln(3)
    pdf.left_text('Defendants.', 12, '', 6, 30)
    pdf.ln(3)
    pdf.double_separator()

    pdf.ln(6)
    pdf.centered_text("PLAINTIFF'S MEMORANDUM OF LAW IN SUPPORT OF", 13, 'BU')
    pdf.centered_text('MOTION FOR SUMMARY JUDGMENT', 13, 'BU')
    pdf.ln(4)
    pdf.separator()

    # ── PRELIMINARY STATEMENT ─────────────────────────────────────
    pdf.ln(4)
    pdf.centered_text('PRELIMINARY STATEMENT', 12, 'BU')
    pdf.ln(4)

    pdf.left_text(
        'Plaintiff Greenfield Capital Partners, LLC ("Greenfield" or "Plaintiff") respectfully '
        'submits this memorandum of law in support of its motion for summary judgment pursuant to '
        'Federal Rule of Civil Procedure 56. As demonstrated below, the undisputed material facts '
        'establish that Defendants Meridian Holdings, Inc. ("Meridian") and David R. Thornton '
        '("Thornton") (collectively, "Defendants") breached the Stock Purchase Agreement dated '
        'March 15, 2023 (the "SPA"), attached hereto as Exhibit A, and the related Indemnification '
        'Agreement, attached hereto as Exhibit B.',
        12, '', 7, 36
    )
    pdf.ln(2)
    pdf.left_text(
        'The evidence is overwhelming and uncontroverted. Defendants\' own documents - including '
        'internal emails produced in discovery (Exhibit C) and the audited financial statements for '
        'fiscal year 2022 (Exhibit D) - conclusively demonstrate that Defendants knowingly '
        'misrepresented the financial condition of Meridian at the time of the transaction.',
        12, '', 7, 36
    )

    # ── STATEMENT OF UNDISPUTED FACTS ─────────────────────────────
    pdf.ln(6)
    pdf.centered_text('STATEMENT OF UNDISPUTED FACTS', 12, 'BU')
    pdf.ln(4)

    facts = [
        (
            'On March 15, 2023, Greenfield and Meridian executed the SPA (Ex. A) pursuant to which '
            'Greenfield agreed to purchase 100% of the outstanding shares of Meridian for $47.5 million.'
        ),
        (
            'Section 4.5 of the SPA (Ex. A at 12-14) contains representations and warranties regarding '
            "Meridian's financial statements, including that such statements were prepared in accordance "
            'with GAAP and fairly present the financial condition of the company.'
        ),
        (
            'Concurrently with the SPA, the parties executed the Indemnification Agreement (Ex. B), '
            'pursuant to which Thornton, as the sole shareholder of Meridian, personally guaranteed the '
            'accuracy of the representations and warranties set forth in the SPA.'
        ),
        (
            'Prior to closing, Greenfield retained the accounting firm of Baker & Whitfield LLP to '
            "conduct due diligence. Baker & Whitfield's due diligence report, dated February 28, 2023 "
            "(Exhibit E), identified certain discrepancies in Meridian's accounts receivable but concluded "
            'that these discrepancies were "within an acceptable range."'
        ),
        (
            'The closing of the transaction occurred on April 30, 2023. At closing, Defendants delivered '
            'a Closing Certificate (Exhibit F) reaffirming all representations and warranties in the SPA.'
        ),
        (
            "In July 2023, Greenfield's post-acquisition review uncovered significant irregularities in "
            "Meridian's financial records. Specifically, Greenfield discovered that Meridian had been "
            'engaging in "channel stuffing" - a practice of accelerating revenue recognition by recording '
            'sales that had not yet been finalized. See Expert Report of Dr. Sarah Chen, CPA '
            '(Exhibit G) at 15-22.'
        ),
        (
            "Dr. Chen's analysis reveals that Meridian overstated its revenue by approximately "
            '$8.3 million for fiscal year 2022 (Exh. G at 23-27). The corrected financial statements, '
            "prepared by Dr. Chen and attached as Exhibit H, demonstrate that Meridian's actual EBITDA "
            'for the period was $12.1 million - not the $18.4 million represented in the original '
            'financial statements (Ex. D).'
        ),
        (
            "Internal emails between Thornton and Meridian's former CFO, Rachel Morrison, produced in "
            'discovery (Ex. C), confirm that Defendants were aware of these accounting irregularities. '
            'In a January 10, 2023 email, Morrison wrote to Thornton: "The Q4 numbers are aggressive. '
            'If the auditors dig into the Apex and Bridgewater receivables, we could have a problem." '
            'Thornton responded: "Keep it tight. The deal needs to close." (Ex. C at VTX-000342-43.)'
        ),
        (
            'On September 15, 2023, Greenfield sent a formal Notice of Claim to Defendants pursuant '
            'to Section 8.2 of the SPA (Exhibit A at 28-30), demanding indemnification in the amount '
            'of $15.2 million. A copy of the Notice of Claim is attached as Exhibit I.'
        ),
        (
            "Defendants responded on October 1, 2023, denying all liability. See Defendants' Response "
            'Letter (Exhibit J).'
        ),
    ]

    for i, fact in enumerate(facts, 1):
        pdf.left_text(f'{i}.', 12, 'B', 7, 20)
        pdf.set_y(pdf.get_y() - 7)
        pdf.left_text(fact, 12, '', 7, 35)
        pdf.ln(2)

    # ── ARGUMENT ──────────────────────────────────────────────────
    pdf.ln(4)
    pdf.centered_text('ARGUMENT', 13, 'BU')
    pdf.ln(4)

    # Point I
    pdf.left_text(
        'I.   DEFENDANTS BREACHED THE REPRESENTATIONS AND WARRANTIES IN THE SPA',
        12, 'B'
    )
    pdf.ln(3)

    pdf.left_text(
        'The undisputed evidence demonstrates that Defendants breached multiple representations and '
        'warranties contained in Section 4.5 of the SPA (Exhibit A). Specifically, the financial '
        "statements provided by Defendants overstated Meridian's revenue by $8.3 million "
        '(Exhibit G at 23-27; Exhibit H), and Defendants knew of these misrepresentations at the time '
        'they were made (Ex. C at VTX-000342-43).',
        12, '', 7, 36
    )
    pdf.ln(2)

    pdf.left_text(
        'Under New York law, a breach of a contractual representation is established where the '
        'representation was false when made. See Galli v. Metz, 973 F.2d 145, 151 (2d Cir. 1992). '
        "Here, the falsity of Defendants' representations is beyond dispute. The expert analysis "
        "(Exhibits G and H) and Defendants' own internal communications (Exhibit C) leave no genuine "
        'issue of material fact.',
        12, '', 7, 36
    )

    # Point II
    pdf.ln(4)
    pdf.left_text(
        'II.  THORNTON IS PERSONALLY LIABLE UNDER THE INDEMNIFICATION AGREEMENT',
        12, 'B'
    )
    pdf.ln(3)

    pdf.left_text(
        'Pursuant to the Indemnification Agreement (Exhibit B), Thornton personally guaranteed the '
        'accuracy of the representations and warranties in the SPA. Section 2.1 of the Indemnification '
        'Agreement (Ex. B at 3-4) provides that the Indemnitor shall "hold harmless and indemnify '
        '[Greenfield] from and against any and all Losses arising from any breach of any '
        'representation, warranty, or covenant."',
        12, '', 7, 36
    )
    pdf.ln(2)

    pdf.left_text(
        "Thornton's personal liability is further supported by the Closing Certificate he executed on "
        'April 30, 2023 (Exhibit F), in which he certified that all representations and warranties '
        'remained true and correct as of the closing date.',
        12, '', 7, 36
    )

    # Point III
    pdf.ln(4)
    pdf.left_text(
        'III. GREENFIELD IS ENTITLED TO DAMAGES OF $15.2 MILLION',
        12, 'B'
    )
    pdf.ln(3)

    pdf.left_text(
        "Greenfield's damages expert, Dr. James Whitmore, has calculated Greenfield's total losses "
        'at $15.2 million. See Expert Report of Dr. James Whitmore (Exhibit K) at 8-14. This figure '
        'accounts for (a) the overpayment attributable to the inflated financial statements '
        '($8.3 million), (b) lost business opportunities resulting from the misrepresented financial '
        'condition ($4.1 million), and (c) costs of investigation and remediation ($2.8 million). '
        'See Ex. K at 14; see also Summary of Damages Calculation (Exhibit L).',
        12, '', 7, 36
    )
    pdf.ln(2)

    pdf.left_text(
        'Each category of damages is supported by documentary evidence and expert testimony. The '
        "investigation costs are documented in invoices from Baker & Whitfield LLP and Greenfield's "
        'internal cost records (Exhibits M and N, respectively).',
        12, '', 7, 36
    )

    # ── CONCLUSION ────────────────────────────────────────────────
    pdf.ln(6)
    pdf.centered_text('CONCLUSION', 13, 'BU')
    pdf.ln(4)

    pdf.left_text(
        'For the foregoing reasons, Plaintiff Greenfield Capital Partners, LLC respectfully requests '
        'that this Court grant its motion for summary judgment in its entirety, and award damages in '
        'the amount of $15.2 million, plus pre-judgment interest, costs, and attorneys\' fees as '
        'provided in Section 9.3 of the SPA (Ex. A at 35).',
        12, '', 7, 36
    )

    # Signature block
    pdf.ln(10)
    pdf.left_text('Dated: New York, New York', 12)
    pdf.left_text('       January 15, 2025', 12)
    pdf.ln(6)

    # Right-aligned signature block
    sig_x = pdf.w / 2 + 18
    pdf.set_font('Times', '', 12)

    lines = [
        'Respectfully submitted,',
        '',
        'WALKER, PRATT & ASSOCIATES LLP',
        '',
        '',
        'By: ________________________________',
        '    Jonathan M. Walker',
        '    Amanda L. Pratt',
        '    85 Broad Street, 28th Floor',
        '    New York, NY 10004',
        '    Tel: (212) 555-0147',
        '    jwalker@walkerpratt.com',
        '',
        '    Attorneys for Plaintiff',
        '    Greenfield Capital Partners, LLC',
    ]

    for line in lines:
        pdf.set_x(sig_x)
        style = 'B' if line == 'WALKER, PRATT & ASSOCIATES LLP' else ''
        pdf.set_font('Times', style, 12)
        pdf.cell(0, 6, line, new_x='LMARGIN', new_y='NEXT')

    return pdf


def build_exhibit_pdfs():
    """Generate professional-looking exhibit PDFs."""
    exhibits = {
        'A': {
            'title': 'STOCK PURCHASE AGREEMENT',
            'content': [
                ('', 'This Stock Purchase Agreement (this "Agreement") is entered into as of March 15, 2023 (the "Effective Date"), by and among:'),
                ('', ''),
                ('B', 'BUYER:'),
                ('', 'Greenfield Capital Partners, LLC, a Delaware limited liability company ("Buyer")'),
                ('', ''),
                ('B', 'SELLER:'),
                ('', 'David R. Thornton, an individual ("Seller")'),
                ('', ''),
                ('B', 'COMPANY:'),
                ('', 'Meridian Holdings, Inc., a Delaware corporation (the "Company")'),
                ('', ''),
                ('BU', 'RECITALS'),
                ('', ''),
                ('', 'WHEREAS, Seller is the sole record and beneficial owner of all issued and outstanding shares of capital stock of the Company (the "Shares"); and'),
                ('', ''),
                ('', 'WHEREAS, Buyer desires to purchase from Seller, and Seller desires to sell to Buyer, all of the Shares, subject to the terms and conditions set forth herein;'),
                ('', ''),
                ('', 'NOW, THEREFORE, in consideration of the mutual covenants and agreements hereinafter set forth, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:'),
                ('', ''),
                ('B', 'ARTICLE I - PURCHASE AND SALE'),
                ('', ''),
                ('', '1.1  Purchase Price. The aggregate purchase price for the Shares shall be Forty-Seven Million Five Hundred Thousand Dollars ($47,500,000) (the "Purchase Price").'),
                ('', ''),
                ('', '1.2  Payment. The Purchase Price shall be paid in full at the Closing by wire transfer of immediately available funds.'),
                ('', ''),
                ('B', '...'),
                ('', ''),
                ('B', 'SECTION 4.5 - REPRESENTATIONS REGARDING FINANCIAL STATEMENTS'),
                ('', ''),
                ('', 'Seller represents and warrants to Buyer that:'),
                ('', ''),
                ('', '(a) The Financial Statements have been prepared in accordance with generally accepted accounting principles ("GAAP") applied on a consistent basis throughout the periods indicated;'),
                ('', ''),
                ('', '(b) The Financial Statements fairly present, in all material respects, the financial condition, results of operations, and cash flows of the Company as of the dates thereof and for the periods indicated therein;'),
                ('', ''),
                ('', '(c) The Company has no liabilities or obligations of any nature (whether accrued, absolute, contingent, or otherwise) that are not reflected or reserved against in the Financial Statements, except for liabilities incurred in the ordinary course of business since the date of the most recent Financial Statements.'),
            ]
        },
        'B': {
            'title': 'INDEMNIFICATION AGREEMENT',
            'content': [
                ('', 'This Indemnification Agreement (this "Agreement") is entered into as of March 15, 2023, concurrently with that certain Stock Purchase Agreement of even date (the "SPA"), by and between:'),
                ('', ''),
                ('', 'David R. Thornton (the "Indemnitor")'),
                ('', 'Greenfield Capital Partners, LLC (the "Indemnitee")'),
                ('', ''),
                ('B', 'SECTION 2.1 - INDEMNIFICATION OBLIGATION'),
                ('', ''),
                ('', 'The Indemnitor hereby agrees to hold harmless and indemnify the Indemnitee and its officers, directors, employees, agents, and affiliates (collectively, the "Indemnified Parties") from and against any and all Losses arising from any breach of any representation, warranty, or covenant contained in the SPA.'),
                ('', ''),
                ('', '"Losses" shall mean any and all losses, damages, liabilities, costs, and expenses (including reasonable attorneys\' fees and expenses of investigation).'),
            ]
        },
        'C': {
            'title': 'INTERNAL EMAIL CORRESPONDENCE',
            'content': [
                ('I', 'Produced in Discovery - Confidential'),
                ('', ''),
                ('B', 'VTX-000342'),
                ('', ''),
                ('', 'From: Rachel Morrison <rmorrison@meridianholdings.com>'),
                ('', 'To: David Thornton <dthornton@meridianholdings.com>'),
                ('', 'Date: January 10, 2023, 3:47 PM EST'),
                ('', 'Subject: Q4 Numbers'),
                ('', ''),
                ('', 'David,'),
                ('', ''),
                ('', 'The Q4 numbers are aggressive. If the auditors dig into the Apex and Bridgewater receivables, we could have a problem. The Apex deal wasn\'t finalized until January 8 and we booked $3.2M in December. Bridgewater is similar - $2.8M booked before their board approved the PO.'),
                ('', ''),
                ('', 'I\'m not comfortable signing off on these without a conversation.'),
                ('', ''),
                ('', '- Rachel'),
                ('', ''),
                ('B', 'VTX-000343'),
                ('', ''),
                ('', 'From: David Thornton <dthornton@meridianholdings.com>'),
                ('', 'To: Rachel Morrison <rmorrison@meridianholdings.com>'),
                ('', 'Date: January 10, 2023, 4:12 PM EST'),
                ('', 'Subject: RE: Q4 Numbers'),
                ('', ''),
                ('', 'Keep it tight. The deal needs to close. We\'ve been doing it this way for two years and nobody has flagged it. Baker & Whitfield will do their standard review and move on. Don\'t overthink it.'),
                ('', ''),
                ('', '- DT'),
            ]
        },
        'D': {
            'title': 'AUDITED FINANCIAL STATEMENTS',
            'content': [
                ('B', 'MERIDIAN HOLDINGS, INC.'),
                ('B', 'Consolidated Financial Statements'),
                ('B', 'For the Fiscal Year Ended December 31, 2022'),
                ('', ''),
                ('I', 'Audited by Morrison & Associates CPAs'),
                ('', ''),
                ('B', 'CONSOLIDATED STATEMENT OF INCOME'),
                ('', ''),
                ('', 'Revenue                              $52,800,000'),
                ('', 'Cost of Goods Sold                   $28,400,000'),
                ('', '                                     ___________'),
                ('', 'Gross Profit                         $24,400,000'),
                ('', ''),
                ('', 'Operating Expenses                    $6,000,000'),
                ('', '                                     ___________'),
                ('', 'EBITDA                               $18,400,000'),
                ('', ''),
                ('', 'Depreciation & Amortization           $2,100,000'),
                ('', '                                     ___________'),
                ('', 'Operating Income                     $16,300,000'),
            ]
        },
        'E': {
            'title': 'DUE DILIGENCE REPORT',
            'content': [
                ('B', 'BAKER & WHITFIELD LLP'),
                ('B', 'Certified Public Accountants'),
                ('', ''),
                ('', 'Date: February 28, 2023'),
                ('', 'Re: Proposed Acquisition of Meridian Holdings, Inc.'),
                ('', 'Prepared for: Greenfield Capital Partners, LLC'),
                ('', ''),
                ('BU', 'EXECUTIVE SUMMARY'),
                ('', ''),
                ('', 'We have conducted financial due diligence procedures on Meridian Holdings, Inc. in connection with the proposed acquisition by Greenfield Capital Partners, LLC.'),
                ('', ''),
                ('', 'Our review identified certain discrepancies in the accounts receivable aging schedules, particularly with respect to two large customer accounts (Apex Technologies and Bridgewater Systems). However, we concluded that these discrepancies were within an acceptable range given the size of the transactions and industry norms for revenue recognition.'),
                ('', ''),
                ('', 'Recommendation: Proceed with standard post-closing audit provisions.'),
            ]
        },
        'F': {
            'title': 'CLOSING CERTIFICATE',
            'content': [
                ('', 'Date: April 30, 2023'),
                ('', ''),
                ('', 'I, David R. Thornton, in my capacity as the sole shareholder of Meridian Holdings, Inc., hereby certify as follows in connection with the closing of the transactions contemplated by the Stock Purchase Agreement dated March 15, 2023:'),
                ('', ''),
                ('', '1. All representations and warranties contained in the Stock Purchase Agreement remain true and correct in all material respects as of the date hereof.'),
                ('', ''),
                ('', '2. All covenants and conditions required to be performed or satisfied prior to or at the Closing have been duly performed and satisfied.'),
                ('', ''),
                ('', '3. No material adverse change has occurred with respect to the Company since the date of the Agreement.'),
                ('', ''),
                ('', ''),
                ('', '________________________________'),
                ('', 'David R. Thornton'),
                ('', 'Sole Shareholder'),
                ('', 'Meridian Holdings, Inc.'),
            ]
        },
        'G': {
            'title': 'EXPERT REPORT OF DR. SARAH CHEN, CPA, CFF',
            'content': [
                ('', 'Prepared for: Walker, Pratt & Associates LLP'),
                ('', 'On behalf of: Greenfield Capital Partners, LLC'),
                ('', 'Date: November 15, 2024'),
                ('', ''),
                ('BU', 'ANALYSIS OF CHANNEL STUFFING PRACTICES (pp. 15-22)'),
                ('', ''),
                ('', 'My investigation revealed that Meridian Holdings engaged in systematic "channel stuffing" by recording revenue on transactions that had not been finalized as of the reporting date. Key instances include:'),
                ('', ''),
                ('', '  - Apex Technologies: $3,200,000 in premature revenue recognition'),
                ('', '  - Bridgewater Systems: $2,800,000 in accelerated bookings'),
                ('', '  - Cascade Networks: $2,300,000 in bill-and-hold arrangements'),
                ('', ''),
                ('BU', 'REVENUE OVERSTATEMENT ANALYSIS (pp. 23-27)'),
                ('', ''),
                ('', 'Total Revenue Overstatement:  $8,300,000'),
                ('', 'Reported Revenue:            $52,800,000'),
                ('', 'Actual Revenue:              $44,500,000'),
                ('', ''),
                ('B', 'Corrected EBITDA:            $12,100,000'),
                ('B', '(vs. reported $18,400,000)'),
            ]
        },
        'H': {
            'title': 'CORRECTED FINANCIAL STATEMENTS',
            'content': [
                ('I', 'Prepared by Dr. Sarah Chen, CPA, CFF'),
                ('', ''),
                ('B', 'MERIDIAN HOLDINGS, INC.'),
                ('B', 'Corrected Consolidated Statement of Income'),
                ('B', 'For the Fiscal Year Ended December 31, 2022'),
                ('', ''),
                ('', 'Revenue (corrected)                  $44,500,000'),
                ('', 'Cost of Goods Sold                   $26,800,000'),
                ('', '                                     ___________'),
                ('', 'Gross Profit                         $17,700,000'),
                ('', ''),
                ('', 'Operating Expenses                    $5,600,000'),
                ('', '                                     ___________'),
                ('B', 'Corrected EBITDA                     $12,100,000'),
                ('', ''),
                ('', 'Depreciation & Amortization           $2,100,000'),
                ('', '                                     ___________'),
                ('', 'Operating Income                     $10,000,000'),
            ]
        },
    }

    import os
    os.makedirs('exhibits', exist_ok=True)

    for label, data in exhibits.items():
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=54)
        pdf.set_margins(54, 54, 54)
        pdf.add_page()

        # Exhibit label banner
        pdf.set_fill_color(30, 58, 90)
        pdf.rect(0, 0, pdf.w, 36, 'F')
        pdf.set_font('Helvetica', 'B', 16)
        pdf.set_text_color(255, 255, 255)
        pdf.set_y(10)
        pdf.cell(0, 12, f'EXHIBIT {label}', align='C', new_x='LMARGIN', new_y='NEXT')

        pdf.set_text_color(0, 0, 0)
        pdf.ln(16)

        # Title
        pdf.set_font('Times', 'BU', 14)
        pdf.cell(0, 8, data['title'], align='C', new_x='LMARGIN', new_y='NEXT')
        pdf.ln(8)

        # Content
        for style, text in data['content']:
            pdf.set_font('Times', style, 11)
            if text:
                pdf.multi_cell(0, 6, text, new_x='LMARGIN', new_y='NEXT')
            else:
                pdf.ln(3)

        filename = f'exhibits/Exhibit_{label}.pdf'
        pdf.output(filename)
        print(f'  Created {filename}')

    # Also generate simpler ones for I-N
    simple_exhibits = {
        'I': ('NOTICE OF CLAIM', 'Formal notice of claim pursuant to Section 8.2 of the SPA, demanding indemnification of $15,200,000.'),
        'J': ('DEFENDANTS\' RESPONSE LETTER', 'Response dated October 1, 2023, denying all liability asserted in the Notice of Claim.'),
        'K': ('EXPERT REPORT - DAMAGES ANALYSIS', 'Dr. James Whitmore calculates total damages of $15,200,000 across three categories.'),
        'L': ('SUMMARY OF DAMAGES CALCULATION', 'Tabular summary: Overpayment $8.3M + Lost opportunities $4.1M + Investigation $2.8M = $15.2M.'),
        'M': ('BAKER & WHITFIELD LLP - INVOICES', 'Professional fee invoices totaling $920,000 for forensic accounting services.'),
        'N': ('INTERNAL COST RECORDS', 'Greenfield internal investigation costs totaling $1,880,000.'),
    }

    for label, (title, summary) in simple_exhibits.items():
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=54)
        pdf.set_margins(54, 54, 54)
        pdf.add_page()

        pdf.set_fill_color(30, 58, 90)
        pdf.rect(0, 0, pdf.w, 36, 'F')
        pdf.set_font('Helvetica', 'B', 16)
        pdf.set_text_color(255, 255, 255)
        pdf.set_y(10)
        pdf.cell(0, 12, f'EXHIBIT {label}', align='C', new_x='LMARGIN', new_y='NEXT')

        pdf.set_text_color(0, 0, 0)
        pdf.ln(16)

        pdf.set_font('Times', 'BU', 14)
        pdf.cell(0, 8, title, align='C', new_x='LMARGIN', new_y='NEXT')
        pdf.ln(8)

        pdf.set_font('Times', '', 11)
        pdf.multi_cell(0, 6, summary, new_x='LMARGIN', new_y='NEXT')
        pdf.ln(4)
        pdf.set_font('Times', 'I', 10)
        pdf.cell(0, 6, '[Full document content omitted for testing purposes]', new_x='LMARGIN', new_y='NEXT')

        filename = f'exhibits/Exhibit_{label}.pdf'
        pdf.output(filename)
        print(f'  Created {filename}')


if __name__ == '__main__':
    print('Generating sample brief PDF...')
    brief = build_brief()
    brief.output('sample-brief.pdf')
    print(f'  Created sample-brief.pdf ({brief.pages_count} pages)')

    print('\nGenerating exhibit PDFs...')
    build_exhibit_pdfs()

    import os as _os
    print(f'\nDone! Files ready in {_os.path.abspath(".")}')
    print('  - sample-brief.pdf (the brief to upload)')
    print('  - exhibits/Exhibit_A.pdf through Exhibit_N.pdf (14 exhibits)')
