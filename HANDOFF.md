# UEMS Session Handoff — 2026-05-31

## What was done this session

### 1. Dashboard overhaul (major)
- Built new `GET /employees/dashboard-charts` backend endpoint that aggregates all chart data in one query
- Rewrote `frontend/src/app/dashboard/page.tsx` with 7 chart sections using Recharts:
  - Stat cards (Universities, Employees, Subjects, Vacant Seats, Designations) with colored icons
  - Stacked bar: Designation distribution across universities
  - Sunburst (3-ring nested pie): Subject → Designation → Post Type per university, with university logo in center
  - Category-wise designation bar chart
  - Employment type → designation bar chart
  - Gender & designation nested donut
  - Sanction vs present grouped bar
- Each chart has a hamburger menu (≡) with: View Fullscreen, Print, Download PNG/JPEG/SVG/CSV, View/Hide data table (dark-themed table below chart)
- Tabs: Hierarchy View (sunburst) / Summary Chart, with university selector + subject filter

### 2. Removed non-teaching from entire project
- Removed `NON_TEACHING` from `EmployeeClassification` enum in Prisma schema
- Cleaned all backend services, controllers, reports, and frontend pages
- Zero references to non-teaching remain

### 3. Employees page redesign
- Blue header table matching reference design
- Columns: Sr.No., University Name, Code, Employee Name, Subject, Category, Selection Category, Designation, Present Designation, Gender, Action
- Action column: View (gray), Edit (blue), Delete (red) icon buttons per row
- Search bar + Add Employee + Upload Excel + Download Excel buttons

### 4. Collapsible sidebar
- Toggle button (`<<` / `>>`) collapses sidebar to 64px icon-only mode
- State persists in localStorage
- Works across all pages

### 5. University logos
- 10 logos added to `frontend/public/logos/` (KUK, MDU, CDLU, CRSU, CBLU, GU, MVSU, IGU, BPSMV, DBRANLU)
- Logo shows in sunburst chart center; falls back to code text when no logo

### 6. Data imports
- CDLU: 20 faculty from `CDLU_Department_Wise_Faculty.xlsx`
- MDU: 289 faculty from `MDU_Detailed_Faculty_Database.xlsx`
- GJU: 215 faculty from `GJU_Faculty_Department_wise.xlsx`
- CRSU: 43 faculty from `CRSU.xlsx`
- **Total: 574 employees** across 5 universities (both local + Railway)

### 7. Added all 14 Haryana universities
- Created all 14 universities with admin users (password: `admin123`)
- 9 universities have no employee data yet — ready for Excel upload

---

## Current state

| Item | Value |
|------|-------|
| **Live frontend** | https://frontend-production-9521.up.railway.app |
| **Live backend** | https://backend-production-7615.up.railway.app/api |
| **Repo** | https://github.com/Rajtaya/UEMS |
| **Latest commit** | `90d108b` on `main` |
| **Local DB** | `postgresql://aarya@localhost:5432/kuk_portal` |
| **Railway DB** | `postgresql://postgres:FgumMmQbxvyKUnHmvEEduzmeIDBVfAvm@zephyr.proxy.rlwy.net:59171/railway` |
| **Universities** | 14 created, 5 with data |
| **Employees** | 574 (local + Railway synced) |

---

## All 14 Universities

| Code | University | City | Admin Login | Has Data |
|------|-----------|------|-------------|----------|
| KUK | Kurukshetra University | Kurukshetra | admin@kuk.ac.in | Yes (5) |
| MDU | Maharshi Dayanand University | Rohtak | admin@mdu.ac.in | Yes (290) |
| CDLU | Chaudhary Devi Lal University | Sirsa | admin@cdlu.ac.in | Yes (21) |
| CRSU | Chaudhary Ranbir Singh University | Jind | admin@crsu.ac.in | Yes (43) |
| GJU | Guru Jambheshwar University of Science & Technology | Hisar | admin@gju.ac.in | Yes (215) |
| CBLU | Chaudhary Bansi Lal University | Bhiwani | admin@cblu.ac.in | No |
| GU | Gurugram University | Gurugram | admin@gu.ac.in | No |
| MVSU | Maharishi Valmiki Sanskrit University | Kaithal | admin@mvsu.ac.in | No |
| IGU | Indira Gandhi University | Meerpur (Rewari) | admin@igu.ac.in | No |
| BPSMV | Bhagat Phool Singh Mahila Vishwavidyalaya | Khanpur Kalan (Sonipat) | admin@bpsmv.ac.in | No |
| DBRANLU | Dr. B.R. Ambedkar National Law University | Sonipat | admin@dbranlu.ac.in | No |
| CCSHAU | Chaudhary Charan Singh Haryana Agricultural University | Hisar | admin@ccshau.ac.in | No |
| DCRUST | Deenbandhu Chhotu Ram University of Science & Technology | Murthal (Sonipat) | admin@dcrust.ac.in | No |
| SVSU | Shri Vishwakarma Skill University | Palwal | admin@svsu.ac.in | No |

**Super Admin:** admin@he.haryana.gov.in / admin123
**State User:** state@he.haryana.gov.in / admin123

---

## Known issues / pending

- **Railway frontend deployments** sometimes don't pick up new code from `railway up` — may need to redeploy from Railway dashboard or trigger via `git push` + Railway auto-deploy
- **Sunburst tab click** — the Recharts SVG overlay intercepts physical clicks on the "Summary Chart" tab; works via keyboard/JS click. Real user clicks should work fine
- **4 missing logos**: GJU, CCSHAU, DCRUST, SVSU — need logo files
- **9 universities without data**: CBLU, GU, MVSU, IGU, BPSMV, DBRANLU, CCSHAU, DCRUST, SVSU — awaiting Excel files

### High Priority pending
| Item | Details |
|------|---------|
| Employee edit page | Currently only detail view — no edit form at /employees/[id]/edit |
| Excel template download | Provide downloadable .xlsx template matching expected columns |
| Preview before import | Show parsed rows before committing to DB |
| Duplicate detection | Check employeeId uniqueness during upload |
| Bulk update via Excel | Currently only inserts — should update existing by employeeId match |

### Medium Priority pending
| Item | Details |
|------|---------|
| Excel (.xlsx) export | Currently CSV only — add xlsx using `xlsx` library |
| PDF export | Add PDF generation for reports |
| Master data management UI | Frontend CRUD page for Subject + Designation masters |
| Subject & Designation dropdown filters | Add to employee list filter bar |

### Low Priority pending
| Item | Details |
|------|---------|
| Password reset flow | Currently no password reset — must be done by Super Admin |
| University CRUD UI | Add/edit universities from frontend (API exists, no UI) |
| Dark mode | Theme support |

---

## Key Gotchas
- **Prisma v7 conflict:** Global Prisma is v7, project pins v6. Always use `./node_modules/.bin/prisma`, never bare `npx prisma`
- **NestJS build path:** Output goes to `dist/src/main.js`, not `dist/main.js`
- **Railway monorepo:** Uses `RAILWAY_DOCKERFILE_PATH=backend/Dockerfile` env var. Dockerfiles use `COPY backend/` (project root context)
- **Next.js cache:** Sometimes needs `.next/` deleted + server restart to pick up changes
- **Frontend env for Railway:** `NEXT_PUBLIC_API_URL` must be set as Docker build arg (baked at build time, not runtime)
