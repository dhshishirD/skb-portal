# Small Kindness Bangladesh (SKB) Works Portal
## Program Officer & Executive Operational Guide (7-Step Project Lifecycle)

**Document Reference**: `SKB-SOP-2026-V3`  
**Target Audience**: Program Officers (PO), Project Managers (PM), Financial Auditors (FA), MEAL Officers (MO), Project Directors (PD)  
**System Location**: [skbportal.online/projects](https://skbportal.online/projects)  
**Last Updated**: October 2026  

---

## Executive Summary & Purpose

The **SKB Works Portal** is Small Kindness Bangladesh's centralized, multi-tenant digital management system designed for humanitarian and development projects. It enforces standardized compliance across donor contracts (such as IHH Turkey, Turkish Diyanet, Qatar Charity), government approvals (NGO Affairs Bureau & RRRC), financial audits, and field execution.

This guide explains how Program Officers and Executive Leaders interact with the **7 Interconnected Lifecycle Tabs** of every project to ensure 100% compliance, zero data loss, and seamless operational flow.

---

## The 7-Step Interconnected Project Lifecycle

Every project registered in the SKB Works Portal automatically features a unified, 7-tab navigation bar at the top of the screen:

| Step # | Tab Name | Route | Operational Purpose |
| :---: | :--- | :--- | :--- |
| **1** | 📄 **1. Project Charter** | `/projects/[id]/charter` | Master 12-Section Charter, 6-Line Budget, GPS Coordinates, RACI Governance, and 4-Executive Sign-Offs. |
| **2** | 📋 **2. Stage Gates** | `/projects/[id]/kanban` | Automated control engine guarding 6 project stages from Inception to Form-7 Closure. |
| **3** | 🎯 **3. Logframe Tree** | `/projects/[id]/logframe` | M&E Logical Framework Hierarchy (Goal → Outcome → Output → Activity → Indicators). |
| **4** | 📝 **4. Tasks & Workplan** | `/projects/[id]/tasks` | Detailed task execution workplan assigned to RACI officers with target due dates. |
| **5** | 👥 **5. Beneficiaries** | `/projects/[id]/beneficiaries` | Encrypted beneficiary register, NID duplicate checking, and consent management. |
| **6** | 📂 **6. Compliance Docs** | `/projects/[id]/documents` | Document repository (MOUs, SWIFT receipts, asset handovers) synced with Donor Portal. |
| **7** | 🛡️ **7. Closing & Audit** | `/projects/[id]/closing-report` | 4-Domain Pre-Submission Audit Working Paper, 5-Executive Sign-Offs, and Form-7 ZIP unlock. |

---

## Section 1: Detailed Tab Breakdown & User Operations

### Tab 1: 📄 Master Project Charter (`/projects/[id]/charter`)
The Project Charter is the foundational contract governing every project.
- **12 Operational Sections**:
  1. Executive Summary & Scope
  2. Key Outputs & Quantitative Deliverables
  3. Alignment with SKB Strategic Mandate
  4. Geographical Scope & GPS Coordinates
  5. Target Beneficiary Matrix (Host vs. Rohingya FCN breakdown)
  6. Detailed Activity Workplan & Milestones
  7. 6-Line Financial Budget Framework (BDT & Donor Currency)
  8. RACI Governance & Interdepartmental Responsibilities
  9. Risk Management & Safeguarding Mitigation
  10. Monitoring, Evaluation & Learning (MEL) Plan
  11. Sustainability & Exit Strategy
  12. Institutional Clearances (NGOAB FD-6/7 & RRRC approvals)
- **Executive Sign-Offs**: Requires 4 digital signatures (Executive Director, Head of Operations, Senior Finance Lead, MEAL Lead) to lock the baseline and release project funds.
- **PDF Export**: Click **`Export Master Charter (.PDF)`** to generate an official document for donor or government filing.

---

### Tab 2: 📋 Stage Gates Kanban (`/projects/[id]/kanban`)
The Stage Gate Kanban board acts as the automated guardian of the project.
- **6 Progression Stages**:
  1. *Stage 1: Concept & Charter Baseline*
  2. *Stage 2: Proposal & Budget Baseline*
  3. *Stage 3: Executive Approval & RACI*
  4. *Stage 4: Field Implementation*
  5. *Stage 5: Pre-Submission Audit*
  6. *Stage 6: Form-7 Export & Closed*
- **Automated Gatekeeping**: A stage cannot be advanced until all prerequisite checklist items are 100% satisfied. Each checklist item provides a direct link button (e.g., `Open Project Charter →` or `View 6-Line Budget →`) to complete missing data.

---

### Tab 3: 🎯 Logframe Tree (`/projects/[id]/logframe`)
The Logical Framework (Logframe) translates Project Charter deliverables into measurable indicators.
- **Hierarchy Structure**:
  - **Goal** (e.g., *Enhanced Livelihood Security in Cox's Bazar*)
  - **Outcome** (e.g., *20 Beneficiary Families Achieve Sustainable Income*)
  - **Output** (e.g., *20 Healthy Dairy Cows Distributed*)
  - **Activity** (e.g., *Procurement, Cattle Vaccination & Field Distribution*)
  - **Indicators** (e.g., *Monthly Milk Yield > 8 Liters/Day*)
- **Operations**: Officers can **Add Node**, **Edit Node**, or **Delete Node** with full permanent persistence across browser reloads.

---

### Tab 4: 📝 Tasks & Workplan (`/projects/[id]/tasks`)
The Workplan turns Logframe Activities into actionable daily tasks.
- **Task Attributes**: Title, Assigned Officer (from RACI Matrix), Priority (High, Medium, Low), Due Date, and Status (`To-Do`, `In Progress`, `Done`).
- **Interactive Controls**: Click checkbox to toggle completion status. Use **Edit Task** or **Delete Task** buttons for updates.

---

### Tab 5: 👥 Project Beneficiaries (`/beneficiaries`)
The Beneficiary Register handles sensitive field data under strict encryption and safeguarding standards.
- **Data Protection**: Encryption of National ID (NID) and Rohingya FCN Smart Cards with duplicate detection.
- **Verification Audit**: Enforces strict compliance rules (e.g., underaged children < 18 are prohibited from signing; parent/guardian NID required).
- **Target Tracking**: Live enrollment totals compare directly against Section 5 Charter targets.

---

### Tab 6: 📂 Compliance Documents (`/documents`)
The central document repository for government and donor compliance.
- **Categories**: MOU Agreements, Bank SWIFT Credit Vouchers, Vendor Invoices, Distribution Photo Logs, Asset Handover Sheets.
- **Live Donor Sync**: Submitted documents synchronize immediately with `skbportal.online/donor-dashboard` for real-time donor review.

---

### Tab 7: 🛡️ Closing & Form-7 Audit (`/closing-report`)
The final audit working paper prepared prior to official project closure.
- **4 Operational Audit Domains**:
  - **Domain A**: Financial & Invoice Declaration Compliance (Form-3 matching, SWIFT receipts).
  - **Domain B**: Beneficiary Documentation & Safeguarding (NID quality, dual signatures per page).
  - **Domain C**: Timeline Sequencing Compliance (AC Declaration Date < Form-7 Signature Date).
  - **Domain D**: Media & Encrypted Vault Compliance (Photo distribution, raw footage storage).
- **5-Executive Sign-Off Panel**: Requires sign-offs from Program Officer, Finance Auditor, Media Officer, Project Coordinator, and Executive Director.
- **Form-7 ZIP Lock**: Unlocks the official Form-7 ZIP Compliance Package once all 4 domains are marked `Compliant` and signed off.

---

## Section 2: Complete Data Interconnection Pipeline

The diagram below demonstrates how data flows automatically between all 7 tabs:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 1. PROJECT CHARTER                      │
                  │   Defines Baseline: Budget, GPS, Beneficiary Targets   │
                  └────────────────────────────┬────────────────────────────┘
                                               │
                                               ├───────────────────────────────────────────────────────┐
                                               ▼                                                       ▼
                  ┌─────────────────────────────────────────────────────────┐             ┌─────────────────────────┐
                  │            2. STAGE GATES (KANBAN)                      │             │ 3. LOGFRAME TREE        │
                  │   Checks Prerequisites against Charter & Closing Audit  │             │ Defines M&E Hierarchy   │
                  └────────────────────────────┬────────────────────────────┘             └────────────┬────────────┘
                                               │                                                       │
                                               │                                                       ▼
                                               │                                          ┌─────────────────────────┐
                                               │                                          │ 4. TASKS & WORKPLAN     │
                                               │                                          │ Executes Activities     │
                                               │                                          └────────────┬────────────┘
                                               │                                                       │
                                               ▼                                                       ▼
                  ┌─────────────────────────────────────────────────────────┐             ┌─────────────────────────┐
                  │            7. CLOSING & FORM-7 AUDIT                    │◄── Verified │ 5. BENEFICIARIES        │
                  │   Verifies 4 Domains & Unlocks Form-7 ZIP Package     │    Files &  └────────────┬────────────┘
                  └─────────────────────────────────────────────────────────┘    Data Audit            │
                                               ▲                                                       ▼
                                               │                                          ┌─────────────────────────┐
                                               └──────────────────────────────────────────│ 6. COMPLIANCE DOCS      │
                                                                                          │ Synced to Donor Vault   │
                                                                                          └─────────────────────────┘
```

---

## Section 3: Day-in-the-Life Officer Workflow

```
STAGE 1: PROJECT INCEPTION (Day 1 - 15)
 ├─► Create Project in Directory (/projects)
 ├─► Complete 12-Section Project Charter (/charter)
 └─► Obtain 4 Executive Digital Sign-Offs -> Stage 1 Cleared on Kanban

STAGE 2: FIELD EXECUTION (Month 1 - 6)
 ├─► Build Logframe Tree (/logframe) & Generate Workplan Tasks (/tasks)
 ├─► Enroll Field Beneficiaries with NID & Consent Verification (/beneficiaries)
 └─► Upload SWIFT receipts, invoices, and photo logs (/documents)

STAGE 3: CLOSING & AUDIT CLEARANCE (Month 6 - 12)
 ├─► Verify 4 Audit Domains A-D on Pre-Submission Working Paper (/closing-report)
 ├─► Collect 5 Executive Sign-Offs
 └─► Download Official Form-7 ZIP Package & Clear Stage 6 on Kanban
```

---

## Summary & Technical Support

- **Live URL**: [https://skbportal.online/projects](https://skbportal.online/projects)
- **Repository Branch**: `main` ([github.com/dhshishirD/skb-portal](https://github.com/dhshishirD/skb-portal))
- **Technical Support & System Admin**: Mizbah Uddin / Daloyar Hassan (SKB IT Operations)
