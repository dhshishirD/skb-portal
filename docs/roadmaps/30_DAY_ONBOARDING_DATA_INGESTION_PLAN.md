# SKB Works Portal — 30-Day Real Data Ingestion & Onboarding Plan

> **Objective:** Transition 100% of Small Kindness Bangladesh (SKB) operations from manual Excel spreadsheets to the live, secure **SKB Works Portal** ([https://skbportal.online](https://skbportal.online)) within 30 days.

---

## 📅 Timeline at a Glance

```mermaid
flowchart LR
    A["Week 1: Credential Setup & Security"] --> B["Week 2: 2026 Projects & Grants Migration"]
    B --> C["Week 3: Executive Assignment & Workflows"]
    C --> D["Week 4: Spreadsheet Cutover & Go-Live"]
```

---

## 🔑 Phase 1: Week 1 — Team Onboarding & Credential Setup (Days 1 – 7)

### 1.1 Team Access Provisioning Matrix
Every staff member is provisioned with their explicit role in the Supabase PostgreSQL `users` table:

| Name | Designation | Target Email | Role / Boundary | Password / MFA Status |
| :--- | :--- | :--- | :--- | :--- |
| **Daloyar Hassan** | Super Admin | `daloyar.pro@gmail.com` | Full System & Governance | Enforced Password + 2FA TOTP |
| **Md. Abu Huraira** | Executive Director | `director@skb.org.bd` | Executive Approval & Project Creation | Password + MFA |
| **Mizbah Uddin** | Program Officer | `uddinmizbah902@gmail.com` | Assigned Project & Field Operations | Password Enforced |
| **MD. Emran** | Program Officer | `emran@skb.org.bd` | Assigned Project & Beneficiary Entry | Password Enforced |
| **Khondokar Md Mukitur Rahman** | IT Officer | `it@skb.org.bd` | User Admin & Tech Operations | Password + MFA |
| **Adv. Aminul Islam Bulbul** | Legal Officer | `legal@skb.org.bd` | Legal & Compliance Review | Password Enforced |

### 1.2 Onboarding Workflow Steps
1. **Password Initialization**:
   - Super Admin triggers user creation/password setup emails via `/admin/users` or direct Supabase Auth invite.
   - Staff receive a secure, one-time link redirecting to `https://skbportal.online/set-password`.
2. **MFA Configuration for Privileged Accounts**:
   - Executive Director & IT Officer scan their QR code on `/mfa` using Google Authenticator or Authy.
3. **Role-Based Access Control (RBAC) Verification**:
   - Confirm Program Officers (`Mizbah Uddin`, `MD. Emran`) are restricted from seeing `/admin/users`.
   - Confirm executive action buttons (e.g., "New Project", "Approve Budget") appear only for Authorized Directors.

---

## 📊 Phase 2: Week 2 — 2026 Projects & Grants Data Ingestion (Days 8 – 17)

### 2.1 Excel Spreadsheet Audit & Standard Mapping Schema
Legacy spreadsheets will be standardized into CSV files matching the portal's relational database schema:

```
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│     Legacy Excel File     │ ───► │  Validated CSV Schema     │ ───► │  Supabase PostgreSQL DB   │
│  "2026_Projects_SKB.xlsx" │      │  (Projects, Grants, Logs) │      │  (RLS Enforced Storage)   │
└───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
```

#### Database Table Mapping Definitions:

1. **`projects` Table**:
   - `code`: e.g. `SKB-2026-WASH-001`
   - `name`: e.g. `Rohingya Refugee Camp Clean Water & Hygiene Phase IV`
   - `donor`: e.g. `UNHCR / International Relief Agency`
   - `budget_bdt`: e.g. `৳ 14,500,000`
   - `start_date` / `end_date`: `2026-01-01` to `2026-12-31`
   - `status`: `active`
   - `assigned_officer_id`: Foreign key linked to `users.id`

2. **`grants` & `budgets` Table**:
   - `grant_code`: e.g. `GRANT-2026-WASH`
   - `disbursed_amount`: Current received funds
   - `remaining_amount`: Available budget pool
   - `category`: `Orphan Care`, `WASH`, `Emergency Response`, `Livelihood`

3. **`logframes` (M&E Targets)**:
   - `indicator_name`: e.g. `Deep Tube Wells Installed`
   - `target_qty`: `45`
   - `current_qty`: Ingested baseline data

### 2.2 Ingestion Script & Quality Checks
- Execute automated CSV validation utility to catch formatting errors:
  - Validating date formats (`YYYY-MM-DD`).
  - Preventing duplicate Project Codes.
  - Ensuring total project budgets match overall grant allocations.

---

## 👔 Phase 3: Week 3 — Executive Project Assignment & Staff Workflows (Days 18 – 24)

### 3.1 Executive Assignment Workflow
1. **Project Creation & Delegation**:
   - Executive Director (`Md. Abu Huraira`) logs in, navigates to `/projects`, and clicks **"+ New SKB Project"**.
   - Selects project sector, budget, timeline, and assigns the primary **Program Officer** (e.g., `Mizbah Uddin`).
2. **Automated Notification Dispatch**:
   - The portal generates an in-app and email alert notifying the Program Officer of their newly assigned project.
3. **Program Officer Workspace Activation**:
   - Program Officer logs in, sees their tailored dashboard, and accesses assigned project modules:
     - **Tasks & Kanban** (`/projects/[id]/tasks`)
     - **Beneficiary Registry & Deduplication** (`/projects/[id]/beneficiaries`)
     - **Financial Expense Claims & Approvals** (`/finance/expense-claims`)

### 3.2 Dual-Verification Run
- Test 3 real-world scenarios live on the portal:
  - **Scenario A**: Program Officer submits an expense claim for field travel. Executive Director reviews and approves.
  - **Scenario B**: Program Officer registers 10 new beneficiaries with NID numbers. System verifies zero duplicate entries.
  - **Scenario C**: M&E Officer generates an AI donor narrative report (`/me/report-generator`).

---

## 🚀 Phase 4: Week 4 — Spreadsheet Cutover & 100% Go-Live (Days 25 – 30)

### 4.1 Spreadsheet Sunsetting Protocol
- Mark all legacy Excel files (`.xlsx`) on SKB local network drives as **"ARCHIVED — READ ONLY"**.
- Standard Operating Procedure (SOP) rule enacted: *No project, approval, or expense is valid unless processed through skbportal.online*.

### 4.2 Field & Donor Interface Activation
- **Field Officers**: Mobile offline report forms activated on `/field-dashboard` for low-bandwidth field data collection in Cox's Bazar, Kurigram, and Sylhet.
- **Donors**: Secure read-only grant report links published on `/donor-dashboard`.

### 4.3 Executive Sign-Off & Governance Audit
- Final review by Executive Director (**Md. Abu Huraira**) and IT Officer (**Khondokar Md Mukitur Rahman**).
- Formal declaration of **100% Transition to Live SKB Works Portal**.

---

## 🛠️ Step-by-Step Action Plan for Antigravity & Team

| Day | Focus Area | Responsible Role | Deliverable |
| :--- | :--- | :--- | :--- |
| **Days 1–3** | Password setup & MFA initialization | IT Officer / Daloyar | All staff passwords created & MFA active |
| **Days 4–7** | RBAC boundary verification | Antigravity AI / IT | Verified non-admin layout restrictions |
| **Days 8–12**| Legacy spreadsheet CSV formatting | Program Officers | Standardized 2026 Project & Grant CSV files |
| **Days 13–17**| Bulk data ingestion into Supabase | Antigravity AI / IT | 100% 2026 data imported & verified |
| **Days 18–21**| Executive project assignment test | Executive Director | Projects assigned to Mizbah & Emran |
| **Days 22–24**| Finance & M&E workflow verification | Finance & M&E Team | Approval & report engine verified |
| **Days 25–27**| Dual-entry test & field activation | Field Team | Mobile offline reporting verified |
| **Days 28–30**| Excel sunsetting & official cutover | Executive Director | 100% Live Portal Operations |
