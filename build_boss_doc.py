import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def build_executive_boss_doc():
    doc = docx.Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Color Palette
    PRIMARY_COLOR = RGBColor(15, 23, 42)    # Slate 900
    ACCENT_BLUE = RGBColor(37, 99, 235)     # Blue 600
    EMERALD_GREEN = RGBColor(16, 185, 129)  # Emerald 600
    TEXT_MUTED = RGBColor(71, 85, 105)      # Slate 600
    AMBER_DARK = RGBColor(217, 119, 6)      # Amber 600

    # Header Title
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    r_sub = title_p.add_run("SMALL KINDNESS BANGLADESH (SKB)\n")
    r_sub.font.size = Pt(11)
    r_sub.font.bold = True
    r_sub.font.color.rgb = ACCENT_BLUE

    r_main = title_p.add_run("SKB Works Portal — Executive Presentation & Complete System Guide\n")
    r_main.font.size = Pt(18)
    r_main.font.bold = True
    r_main.font.color.rgb = PRIMARY_COLOR

    r_meta = title_p.add_run("Prepared for Executive Directorate | Live Production Deployment | September 30, 2026")
    r_meta.font.size = Pt(9.5)
    r_meta.font.italic = True
    r_meta.font.color.rgb = TEXT_MUTED

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # SECTION 1: MASTER DIRECT LINKS TABLE FOR BOSS'S COMPUTER
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("1. Master Quick Links Directory (For Boss's Computer Browser)")
    r_h1.font.color.rgb = PRIMARY_COLOR
    r_h1.font.size = Pt(14)
    r_h1.font.bold = True

    p_link_intro = doc.add_paragraph()
    p_link_intro.paragraph_format.space_after = Pt(8)
    p_link_intro.add_run("Click any link below on your computer browser to view live system features during the presentation:")

    links_table = doc.add_table(rows=10, cols=3)
    links_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    headers = ["System Module", "Live Web Link (Clickable)", "Purpose & Key Highlight"]
    hdr_row = links_table.rows[0]
    for idx, text in enumerate(headers):
        cell = hdr_row.cells[idx]
        set_cell_background(cell, "0F172A")
        set_cell_margins(cell, top=140, bottom=140, left=140, right=140)
        p = cell.paragraphs[0]
        r = p.add_run(text)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    link_data = [
        ("Portal Main Landing", "https://skbportal.online", "Main portal entrance & system authentication"),
        ("International Donor Hub", "https://skbportal.online/donor-dashboard", "9-File Inspection Vault, Document Previews, Donor Sign-off & Zip Downloads"),
        ("Staff Operations Center", "https://skbportal.online/dashboard", "Donor Objections Panel, Expense Approvals, and HQ Community Bulletin"),
        ("Projects & Program Directory", "https://skbportal.online/projects", "Master project list with 1-click '📂 Documents' links"),
        ("Project Document Vault", "https://skbportal.online/projects/1/documents", "Program Officer document submission hub with live sync to Donor Hub"),
        ("AI Donor Generator & Form-7", "https://skbportal.online/me/report-generator", "Auto-generate Form-7 PDF completion reports & 3-quote budget tools"),
        ("HQ Staff Community Hub", "https://skbportal.online/community", "Internal staff discussion feed, field notices, and officer profile switcher"),
        ("Field Officer Mobile PWA", "https://skbportal.online/field-dashboard", "Touch-friendly mobile PWA workspace with offline IndexedDB queue"),
        ("Beneficiary NID Registry", "https://skbportal.online/beneficiaries", "Encrypted beneficiary intake with 100% NID deduplication protection")
    ]

    for row_idx, (module_name, link_url, desc) in enumerate(link_data, start=1):
        row = links_table.rows[row_idx]
        c0, c1, c2 = row.cells[0], row.cells[1], row.cells[2]
        
        c0.width = Inches(1.8)
        c1.width = Inches(2.7)
        c2.width = Inches(2.3)

        for c in (c0, c1, c2):
            set_cell_margins(c, top=100, bottom=100, left=120, right=120)
            if row_idx % 2 == 0:
                set_cell_background(c, "F8FAFC")

        p0 = c0.paragraphs[0]
        r0 = p0.add_run(module_name)
        r0.font.bold = True
        r0.font.size = Pt(9)
        r0.font.color.rgb = PRIMARY_COLOR

        p1 = c1.paragraphs[0]
        r1 = p1.add_run(link_url)
        r1.font.size = Pt(8.5)
        r1.font.color.rgb = ACCENT_BLUE
        r1.font.underline = True

        p2 = c2.paragraphs[0]
        r2 = p2.add_run(desc)
        r2.font.size = Pt(8.5)
        r2.font.color.rgb = TEXT_MUTED

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # SECTION 2: 5-MINUTE LIVE DEMO SCRIPT FOR THE BOSS
    h2 = doc.add_heading(level=1)
    r_h2 = h2.add_run("2. 5-Minute Live Presentation Walkthrough Script")
    r_h2.font.color.rgb = PRIMARY_COLOR
    r_h2.font.size = Pt(14)
    r_h2.font.bold = True

    steps = [
        ("Step 1: Present the International Donor Intelligence Portal", 
         "https://skbportal.online/donor-dashboard",
         "Show how donors (IHH Turkey, UNHCR) log in to inspect ongoing projects. Point out the Running, Attention Needed, and Audited tabs with multi-currency grant tracking (USD, EUR, TRY, BDT)."),
        
        ("Step 2: Inspect 9-File Compliance Vault & Live PDF Previews", 
         "Click 'Inspect Primary & Special Documents' on PID 22567",
         "Demonstrate that donors no longer receive 20 MB email attachments. Click 'Preview' on Form-7 Report or NID List to view formatted PDF layouts inline. Click 'Download Full Package (.zip)' to download all compliance files in 1 click."),

        ("Step 3: Demonstrate 1-Click Donor Grant Clearance Sign-Off", 
         "Click '✓ Approve Compliance Package' inside the Donor Vault",
         "Show how international audit teams formally sign off on SKB project packages with 1 click, instantly updating the status to '✓ Approved by Partner Audit'."),

        ("Step 4: Show Interconnected Donor Correction Alerts on Staff Dashboard", 
         "https://skbportal.online/dashboard",
         "Show how donor clarification tickets route live to Executive Director Md. Abu Huraira and Program Officers (Mizbah Uddin / MD. Emran). Demonstrate posting a formal clarification letter directly from the dashboard."),

        ("Step 5: Show Program Officer Document Submissions & Field PWA", 
         "https://skbportal.online/projects & https://skbportal.online/field-dashboard",
         "Show the 1-click '📂 Documents' button on project cards for Program Officers to upload files. Then open /field-dashboard to show the touch-friendly mobile PWA built for field officers in Cox's Bazar and Kurigram with offline IndexedDB queue.")
    ]

    for title, link_ref, script_text in steps:
        p_step = doc.add_paragraph()
        p_step.paragraph_format.space_after = Pt(6)
        
        r_st = p_step.add_run(f"• {title}\n")
        r_st.font.bold = True
        r_st.font.size = Pt(11)
        r_st.font.color.rgb = PRIMARY_COLOR

        r_lr = p_step.add_run(f"  Target URL / Action: {link_ref}\n")
        r_lr.font.size = Pt(9.5)
        r_lr.font.bold = True
        r_lr.font.color.rgb = ACCENT_BLUE

        r_sc = p_step.add_run(f"  What to Say: \"{script_text}\"")
        r_sc.font.size = Pt(9.5)
        r_sc.font.color.rgb = TEXT_MUTED

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # SECTION 3: MULTI-DONOR CUSTOMIZATION & FIELD OFFICER UPGRADE
    h3 = doc.add_heading(level=1)
    r_h3 = h3.add_run("3. Multi-Donor Workflows & Field Officer PWA Architecture")
    r_h3.font.color.rgb = PRIMARY_COLOR
    r_h3.font.size = Pt(14)
    r_h3.font.bold = True

    p_md = doc.add_paragraph()
    p_md.paragraph_format.space_after = Pt(8)
    p_md.add_run(
        "A. How Multi-Donor Customization Works for Different Donors:\n"
        "1. Donor Isolation & Unique Access Tokens: Donors receive a dedicated link (e.g. donor-dashboard?partner=ihh or donor-dashboard?partner=unhcr). Data isolation ensures donors ONLY see projects funded by their organization.\n"
        "2. Donor-Specific Document Rules: IHH Turkey receives Form-7 Reports, 3-quote vendor proposals, and orphan guardian letters. UNHCR receives WASH water quality reports, Camp 11 location maps, and UNHCR banner photos.\n"
        "3. Custom Branding & Flags: Displays partner logo & flag (🇹🇷 IHH Turkey in TRY/EUR, 🇺🇳 UNHCR in USD, 🇶🇦 Qatar Charity in QAR/USD).\n"
        "4. 1-Click Audit Clearance: Donors click '✓ Approve Compliance Package' to grant official grant clearance.\n\n"
        "B. Field Officer Mobile PWA Upgrade (/field-dashboard):\n"
        "1. Mobile High-Contrast Touch UI: Built for Android smartphones under direct sunlight in Cox's Bazar and Kurigram.\n"
        "2. 4-Card Touch Menu: Quick touch access to Register Beneficiary (KoBo 8-field form), Progress Reports, Expense Claims, and Upload Photos to Google Drive.\n"
        "3. Offline IndexedDB Queue: Stores offline survey submissions locally when internet drops, with 1-click 'Sync All Reports Now' when 4G re-connects.\n"
        "4. PWA Sticky Bottom Bar: Touch navigation for Field Home, New NID, Progress Report, and Sync Queue."
    )

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # SECTION 4: SYSTEM VALUE PROPOSITION TABLE
    h4 = doc.add_heading(level=1)
    r_h4 = h4.add_run("4. Executive Summary of Value Delivered to SKB")
    r_h4.font.color.rgb = PRIMARY_COLOR
    r_h4.font.size = Pt(14)
    r_h4.font.bold = True

    val_table = doc.add_table(rows=5, cols=3)
    val_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    v_hdr = val_table.rows[0]
    for idx, text in enumerate(["Previous Operational Bottleneck", "SKB Works Portal Solution", "Quantifiable Impact"]):
        cell = v_hdr.cells[idx]
        set_cell_background(cell, "059669")
        set_cell_margins(cell, top=120, bottom=120, left=120, right=120)
        p = cell.paragraphs[0]
        r = p.add_run(text)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    val_data = [
        ("Emailing 20 MB PDF files back & forth to donors", "Interactive Live Donor Hub (/donor-dashboard) with 1-click preview", "100% Audit Transparency & Zero Email Clutter"),
        ("Manual Form-7 report compilation per project", "1-Click AI Form-7 PDF Generator (/me/report-generator)", "Hours saved per project submission"),
        ("Unchecked vendor quote comparisons", "3-Proposal Procurement Tool with automated lowest price calculation", "Enforces lowest-price procurement compliance"),
        ("Disconnected field submissions in remote camps", "Offline PWA Field Workspace with IndexedDB local queue", "Zero data loss in low-connectivity regions")
    ]

    for row_idx, (b, s, i) in enumerate(val_data, start=1):
        row = val_table.rows[row_idx]
        c0, c1, c2 = row.cells[0], row.cells[1], row.cells[2]
        for c in (c0, c1, c2):
            set_cell_margins(c, top=100, bottom=100, left=120, right=120)
            if row_idx % 2 == 0:
                set_cell_background(c, "F0FDF4")
        
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(b)
        r0.font.size = Pt(8.5)
        r0.font.color.rgb = PRIMARY_COLOR
        
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(s)
        r1.font.bold = True
        r1.font.size = Pt(8.5)
        r1.font.color.rgb = ACCENT_BLUE

        p2 = c2.paragraphs[0]
        r2 = p2.add_run(i)
        r2.font.bold = True
        r2.font.size = Pt(8.5)
        r2.font.color.rgb = EMERALD_GREEN

    # Footer Signoff
    doc.add_paragraph().paragraph_format.space_after = Pt(20)
    footer_p = doc.add_paragraph()
    footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_foot = footer_p.add_run("SKB Works Portal • Executive Presentation & System Master Manual • September 2026")
    r_foot.font.size = Pt(9)
    r_foot.font.italic = True
    r_foot.font.color.rgb = TEXT_MUTED

    target_path = r"g:\SKB Portal\SKB_Works_Portal_Executive_Presentation_And_System_Guide.docx"
    doc.save(target_path)
    print(f"Executive presentation doc saved successfully at: {target_path}")

if __name__ == "__main__":
    build_executive_boss_doc()
