import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

def create_element(name):
    return OxmlElement(name)

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def build_document():
    doc = docx.Document()
    
    # Page setup - Margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Styles & Colors
    PRIMARY_COLOR = RGBColor(15, 23, 42)    # Slate 900
    ACCENT_BLUE = RGBColor(37, 99, 235)     # Blue 600
    TEXT_MUTED = RGBColor(71, 85, 105)      # Slate 600
    GREEN_COLOR = RGBColor(16, 185, 129)    # Emerald 600

    # Document Header Title
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_org = title_p.add_run("SMALL KINDNESS BANGLADESH (SKB)\n")
    run_org.font.size = Pt(12)
    run_org.font.bold = True
    run_org.font.color.rgb = ACCENT_BLUE

    run_title = title_p.add_run("SKB Works Portal — Complete Features & Master System Documentation")
    run_title.font.size = Pt(20)
    run_title.font.bold = True
    run_title.font.color.rgb = PRIMARY_COLOR

    meta_p = doc.add_paragraph()
    meta_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta_run = meta_p.add_run("System URL: https://skbportal.online  |  Status: 100% Production Live  |  Date: September 30, 2026")
    meta_run.font.size = Pt(9.5)
    meta_run.font.italic = True
    meta_run.font.color.rgb = TEXT_MUTED

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Executive Overview
    h1 = doc.add_heading(level=1)
    run_h1 = h1.add_run("1. Executive Overview & Platform Vision")
    run_h1.font.color.rgb = PRIMARY_COLOR
    run_h1.font.size = Pt(14)
    run_h1.font.bold = True

    p_exec = doc.add_paragraph()
    p_exec.paragraph_format.line_spacing = 1.15
    p_exec.paragraph_format.space_after = Pt(10)
    p_exec.add_run(
        "The SKB Works Portal (skbportal.online) is a full-stack, multi-tenant digital operations platform engineered for "
        "Small Kindness Bangladesh. It interconnects HQ Management, Field Program Officers, M&E Specialists, Finance Managers, "
        "and International Donor Partners (such as IHH Humanitarian Relief Foundation and UNHCR) into a unified, transparent digital environment.\n\n"
        "The system replaces cumbersome 20 MB email PDF exchanges with an interactive live Donor Hub, automates official NGO Affairs Bureau Form-7 "
        "completion report generation, enforces 3-quote lowest-price procurement compliance, ingests live KoBoToolbox field data, and secures "
        "beneficiary records with 100% government NID deduplication protection."
    )

    # Section 2: Complete Feature List Module by Module
    h2 = doc.add_heading(level=1)
    run_h2 = h2.add_run("2. Comprehensive Feature Catalog (Module by Module)")
    run_h2.font.color.rgb = PRIMARY_COLOR
    run_h2.font.size = Pt(14)
    run_h2.font.bold = True

    modules = [
        {
            "title": "Module 1: International Donor Intelligence Portal (/donor-dashboard)",
            "color": "2563EB",
            "items": [
                ("Executive Donor Intelligence Overview", "Live portfolio dashboard tracking grants across 19 real SKB project PIDs from Google Drive ('Accumulated projects 2026')."),
                ("Categorized Project Views", "Tabbed filtering for Running/On-Going, Needs Attention, and Completed & Audited projects."),
                ("Document Inspection Vault", "Two-section inspection vault displaying 7 Primary Baseline Files (Form-7, Invoice Declaration, AC Audit Clearance, Verified Beneficiary List, Beneficiary NID Cards Archive, High-Res Picture Album link, Bank Certificate) plus Special Submissions (Underaged Guardian Replacement Letters, Orphan Legal Signature Certificates, Refugee WASH Reports)."),
                ("Live Interactive Document Previewer", "Inline high-fidelity document previews for Form-7 PDF reports, NID tables, CA audit statements, and direct Google Drive photo folder links."),
                ("1-Click Individual Downloads & ZIP Exporter", "Download any single document file or click 'Download Full Package (.zip)' to download the complete 9-file compliance archive in 1 click."),
                ("Donor Grant Sign-Off & Approval Engine", "Green '✓ Approve Compliance Package' button for official donor partner sign-off and audit clearance."),
                ("Donor Objection & Correction Ticket System", "Allows donors to submit queries/objections directly to assigned Program Officers (Mizbah Uddin / MD. Emran) and Executive Director Md. Abu Huraira.")
            ]
        },
        {
            "title": "Module 2: Projects Directory & Program Officer Document Vault (/projects & /projects/[id]/documents)",
            "color": "0D9488",
            "items": [
                ("Projects & Program Directory (/projects)", "Master program overview featuring budget amount, milestone completion progress bar, target location, and assigned Program Officer."),
                ("1-Click Sub-Tabs Bar on Project Cards", "Direct quick-action links on every project card: 📋 Kanban, 🎯 Logframe, 📝 Work Plan, 👥 Beneficiaries, and 📂 Documents."),
                ("Program Officer Document Vault (/projects/[id]/documents)", "Dedicated officer workspace to upload, auto-generate Form-7 reports, and manage compliance files with live synchronization to /donor-dashboard."),
                ("Kanban Project Lifecycle Board (/projects/[id]/kanban)", "Drag-and-drop project stage progression (Inception → Proposal Approved → Implementation → Audited & Closed)."),
                ("Logframe Indicator Matrix (/projects/[id]/logframe)", "Logical Framework matrix tracking target vs. achieved indicators (e.g. # of deep tube-wells, # of livestock distributed)."),
                ("Work Plan & Tasks (/projects/[id]/tasks)", "Task assignment, officer work plans, and milestone deadline tracking.")
            ]
        },
        {
            "title": "Module 3: AI Donor Generator & Form-7 Exporter (/me/report-generator)",
            "color": "7C3AED",
            "items": [
                ("1-Click Form-7 Completion Report Generator", "Auto-generates official NGO Affairs Bureau & IHH format Form-7 PDF project completion reports."),
                ("3-Proposal Proposed Budget Tool", "3-quote vendor proposal comparison calculator with automated lowest-price winner selection and savings calculation vs. highest quote."),
                ("Standard 9-File Compliance Package Vault", "View, verify, and export all 9 submission files matching official Google Drive audit folder structures."),
                ("AI Narrative Auto-Drafting (/api/ai/draft-narrative)", "Gemini-powered narrative generator for donor grant reporting.")
            ]
        },
        {
            "title": "Module 4: Staff Dashboard & Operations Center (/dashboard)",
            "color": "D97706",
            "items": [
                ("Primary Telemetry Cards", "Real-time indicators for Active Projects, Active Grants, Donor Correction Alerts, and NID-Verified Beneficiaries."),
                ("Interconnected Donor Correction Alerts Card", "Displays incoming donor query tickets with a 1-click 'Post Officer Clarification Response' modal."),
                ("Immediate Action Queues", "Pending financial expense claims and procurement vendor bids requiring HQ review."),
                ("Active Program Portfolio Overview", "Live progress bars and budget allocations for active projects."),
                ("Embedded HQ Community Bulletin", "Live feed displaying recent staff announcements and field updates.")
            ]
        },
        {
            "title": "Module 5: HQ Staff Community Hub (/community) & User Profile Avatars",
            "color": "2563EB",
            "items": [
                ("HQ Community Discussion Feed (/community)", "Shared bulletin for HQ staff and field leads featuring categories: 📢 HQ Announcements, 🌾 Field Updates, ⚠️ Donor Objections & Corrections, 💡 NGO Best Practices."),
                ("Post Interaction & Comments", "Like counter, comment threads, author role badges, and document attachment tags."),
                ("Staff Header Profile Card & Avatar Photos", "Renders custom avatar photos for staff users in header navigation and profile cards."),
                ("Interactive Officer Profile Switcher", "Header dropdown allowing quick profile switching between Executive Director Md. Abu Huraira, Program Officers Mizbah Uddin & MD. Emran, and IT Manager Muktadir Rahaman.")
            ]
        },
        {
            "title": "Module 6: Finance, Approvals & Multi-Currency Engine (/finance/...)",
            "color": "059669",
            "items": [
                ("3-Tier Financial Approval Pipeline (/finance/approvals)", "Field Officer/PM → Finance Manager → Executive Director expense review with approval audit trails."),
                ("Multi-Currency Support Engine", "Supports 4 major currencies: USD ($), EUR (€), TRY (₺), BDT (৳) with automated conversion rates to BDT base currency."),
                ("Multi-Grant Expense Claims (/finance/expense-claims)", "Claim log submissions, receipts, and disbursement audit trails."),
                ("Budget Burn-Rate Telemetry (/finance/budgets)", "Spent vs. remaining grant budget tracking.")
            ]
        },
        {
            "title": "Module 7: Beneficiary Registry & Field Automation (/beneficiaries & /field-dashboard)",
            "color": "DC2626",
            "items": [
                ("Beneficiary Master Registry (/beneficiaries)", "Encrypted personal NID records with 100% government NID deduplication protection."),
                ("KoBoToolbox REST Webhook Auto-Sync (/api/webhooks/kobotoolbox)", "Real-time field data ingestion from KoBoToolbox (eu.kobotoolbox.org) and ODK Collect mobile apps."),
                ("Offline PWA Field Workspace (/field-dashboard)", "Offline-first mobile web app for field officers operating in remote areas (Rohingya Camps, Hill Tracts, Kurigram flood zones)."),
                ("Special Underaged Guardian Clarification System", "Handles minor orphan beneficiary representation by legal guardians (e.g. Fatema Begum NID 1985269123456).")
            ]
        },
        {
            "title": "Module 8: Procurement, Security & Administration (/admin/... & /procurement/...)",
            "color": "4F46E5",
            "items": [
                ("Procurement & Vendor Bid Evaluation (/procurement/requests & /procurement/vendors)", "Vendor registry, tax compliance status check, and 3-quote procurement evaluations."),
                ("Role-Based Access Control (RBAC) (/admin/users)", "Multi-tenant user provisioning for Executive Director, Program Officers, Finance, M&E, and IT Admin."),
                ("System Security Audit Logging (/admin/audit-log)", "Immutable security audit logs tracking every user action and login event."),
                ("Automated Email & SMS Alerts (notificationService.ts)", "Resend API email alerts and SMS notifications to officers."),
                ("Dual-Language Switcher", "Instant UI toggle between English and Bangla (বাংলা).")
            ]
        }
    ]

    for mod in modules:
        mh = doc.add_heading(level=2)
        m_run = mh.add_run(mod["title"])
        m_run.font.color.rgb = PRIMARY_COLOR
        m_run.font.size = Pt(12)
        m_run.font.bold = True

        for feature_name, feature_desc in mod["items"]:
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.line_spacing = 1.15
            
            run_fn = p.add_run(f"{feature_name}: ")
            run_fn.font.bold = True
            run_fn.font.color.rgb = PRIMARY_COLOR
            
            run_fd = p.add_run(feature_desc)
            run_fd.font.color.rgb = TEXT_MUTED

    # Section 3: Technical Stack & System Specs Table
    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    h3 = doc.add_heading(level=1)
    run_h3 = h3.add_run("3. System Specifications & Technical Architecture Summary")
    run_h3.font.color.rgb = PRIMARY_COLOR
    run_h3.font.size = Pt(14)
    run_h3.font.bold = True

    table = doc.add_table(rows=6, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    table_data = [
        ("Production URL", "https://skbportal.online (Vercel Edge Deployment)"),
        ("Source Code Repository", "https://github.com/dhshishirD/skb-portal.git (branch: main)"),
        ("Frontend Framework", "Next.js 14 App Router, React 18, Tailwind CSS, Lucide Icons"),
        ("Backend & Database", "Supabase Cloud PostgreSQL, Row-Level Security (RLS), Resend API, KoBoToolbox Webhooks"),
        ("Test Suite", "Vitest 2.1.9 (42/42 Unit Tests Passing, 33/33 Production Build Routes Compiled)"),
        ("Supported Currencies", "USD ($), EUR (€), TRY (₺), BDT (৳) with BDT Base Rate Conversion")
    ]

    for row_idx, (k, v) in enumerate(table_data):
        row = table.rows[row_idx]
        cell_k, cell_v = row.cells[0], row.cells[1]
        
        cell_k.width = Inches(2.2)
        cell_v.width = Inches(4.6)
        
        set_cell_margins(cell_k, top=120, bottom=120, left=150, right=150)
        set_cell_margins(cell_v, top=120, bottom=120, left=150, right=150)
        
        if row_idx % 2 == 0:
            set_cell_background(cell_k, "F8FAFC")
            set_cell_background(cell_v, "F8FAFC")
        else:
            set_cell_background(cell_k, "FFFFFF")
            set_cell_background(cell_v, "FFFFFF")

        p_k = cell_k.paragraphs[0]
        r_k = p_k.add_run(k)
        r_k.font.bold = True
        r_k.font.size = Pt(10)
        r_k.font.color.rgb = PRIMARY_COLOR

        p_v = cell_v.paragraphs[0]
        r_v = p_v.add_run(v)
        r_v.font.size = Pt(10)
        r_v.font.color.rgb = TEXT_MUTED

    # Sign-off Footer Box
    doc.add_paragraph().paragraph_format.space_after = Pt(16)
    footer_p = doc.add_paragraph()
    footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    f_run = footer_p.add_run("Official System Documentation • Small Kindness Bangladesh (SKB) • 2026")
    f_run.font.size = Pt(9)
    f_run.font.italic = True
    f_run.font.color.rgb = TEXT_MUTED

    # Save file
    target_path = r"g:\SKB Portal\SKB_Works_Portal_Complete_System_Features.docx"
    doc.save(target_path)
    print(f"Document saved successfully at: {target_path}")

if __name__ == "__main__":
    build_document()
