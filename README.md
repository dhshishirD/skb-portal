# NGO Works Portal

Unified, mobile-first operations and field reporting platform for non-governmental organizations in Bangladesh.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v24+
- **Package Manager**: `pnpm` (v12)

### 1. Installation & Setup
```bash
# Clone the repository and install dependencies
pnpm install

# Approve build scripts for pnpm v12 (if prompted)
pnpm approve-builds --all
```

### 2. Local Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 How to Log In as Each Role Locally

For local development and testing, use the following seeded test user credentials:

| Role | Email | Privileges & Access Scope | MFA Required? |
|---|---|---|---|
| **Super Admin** | `admin@ngo-portal.org` | User management, security audit log, system configuration | ✅ Yes (TOTP) |
| **Executive** | `executive@ngo-portal.org` | High-value expense approval, read-access to all projects/grants | ✅ Yes (TOTP) |
| **Programme Manager** | `pm@ngo-portal.org` | Project Kanban stage gate control, logframe & budget management | ✅ Yes (TOTP) |
| **Finance** | `finance@ngo-portal.org` | Expense verification, grant tracking, multi-currency budget control | ✅ Yes (TOTP) |
| **Project Officer** | `officer@ngo-portal.org` | Assigned project editing, task tracking, field report review | ❌ No |
| **Field Officer** | `field@ngo-portal.org` | Mobile PWA offline report submission & receipt photo claims | ❌ No |
| **M&E Officer** | `me@ngo-portal.org` | Indicator validation, field report validation, M&E dashboards | ❌ No |
| **Procurement** | `procurement@ngo-portal.org` | Purchase requests, vendor management, quotations & POs | ❌ No |
| **Donor** | `donor1@ngo-portal.org` | Read-only access to published reports for own grants (USAID) | ❌ No |
| **Partner** | `partner1@ngo-portal.org` | Activity reporting & expense submission for assigned tasks | ❌ No |
| **Auditor** | `auditor@ngo-portal.org` | Time-limited read-only audit access (expires in 30 days) | ❌ No |

*Note: Default local development password for all seeded users is set via Supabase Auth CLI or invite flow.*

---

## 🧪 Available Scripts

```bash
pnpm dev          # Run Next.js local development server
pnpm typecheck    # Run strict TypeScript type checks (tsc --noEmit)
pnpm test         # Run Vitest unit & security test suite
pnpm test:e2e     # Run Playwright E2E tests (Mobile & Desktop Chrome)
pnpm lint         # Run ESLint validation
pnpm build        # Compile production build
```

---

## 🛡️ Security Architecture

* **Database-First Row Level Security (RLS)**: Enforced directly inside Postgres via [0001_foundation.sql](file:///g:/SKB%20Portal/supabase/migrations/0001_foundation.sql).
* **Multi-Factor Authentication**: TOTP MFA enforced for privileged roles (`super_admin`, `executive`, `finance`, `programme_manager`).
* **Append-Only Audit Log**: Captured automatically via Postgres triggers with `app.actor_id`.
