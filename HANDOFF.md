# UEMS Session Handoff — 2026-05-31 (Updated 2026-05-31 session 2)

## What was done this session (Session 2 — 2026-05-31)

### 9. Dashboard charts — advanced interactivity
- **All Universities summary view**: Added "All Universities" option to dropdown, aggregates subjects/designations/post-types across all 14 universities for both Hierarchy View (sunburst) and Summary Chart (bar chart)
- **Sunburst 4-ring with drill-down**: Center = university name (blue circle), Ring 1 = subjects (clickable), Ring 2 = designations, Ring 3 = post types. Click subject → drill into that subject. Click designation → drill into that designation. Breadcrumb navigation to go back.
- **Series-level hover highlight**: Hovering a designation (e.g., "Assistant Professor") highlights that color across ALL bars in the chart, dims everything else to 15% opacity. Works on all 5 bar charts + Gender donut + Sanction chart.
- **Custom tooltips**: Bar charts show only the hovered series (not all). Sanction chart pairs Sanction + Present values for the same designation. Gender chart shows percentage.
- **Gender chart**: Monochromatic blue/purple scheme (Male=dark, Female=light). Labels inside inner ring. Designation hover highlights across both genders.
- **Sanction chart**: Grouped-stacked bars (Sanction dark + Present light side by side). 2-column legend paired by designation. Total labels on each stack.
- **White stroke markers** between all stacked bar segments across all charts
- **Consistent bar sizing** (`barSize={40}`) on Category-wise & Employment Type charts
- **Wrapped university names** on X-axis using custom multi-line SVG tick component (14 chars/line, 40° rotation, 11px font)

### 10. Layout & overflow fixes
- **Sticky sidebar**: Changed from `min-h-screen` to `h-screen sticky top-0 overflow-y-auto` — stays visible when scrolling
- **Horizontal overflow fix**: Added `overflow-x-hidden` to `<main>` in all 7 layout files (dashboard, reports, employees, universities, users, sanctioned-posts, settings)
- **Next.js proxy fix**: Updated `next.config.ts` rewrite destination from port 4000 to 3001
- **SVG focus outlines removed**: Added CSS to suppress browser focus rectangles on pie segments

### 11. Employees page enhancements
- **Column show/hide**: "Columns" dropdown button with checkboxes for each column, persisted to localStorage
- **Filter panel**: Collapsible filter bar with 6 dropdowns (University, Gender, Category, Post Type, Status, Designation), active filter tags with remove buttons, "Clear all" button
- **Polished breadcrumb**: Home icon, chevron, people icon
- **Employee count badge**: Shows total in title "Employees (1,277)"
- **Alternating row colors** and sticky Action column
- **Readable filter tags**: Shows "University: CDLU" instead of raw database IDs

### 12. Data additions
- **81 dummy employees for KUK** across 20 departments (total now 86)
- **88 subject-wise sanction posts for KUK** (4 designations × 22 subjects, sanctioned > present for vacancies)
- **Removed "Other Teaching Posts"** from BPSMV (84 records reassigned to Assistant Professor)
- **KUK set as default university** for dashboard

### 13. Chart label fixes
- **Gender donut labels**: Fixed clipping by reducing radii and adding margins
- **Sunburst ring labels**: Separate thresholds per ring (3% inner, 1.5% middle, 1% outer)
- **Bar chart X-axis**: University names wrapped into multiple lines instead of truncated codes
- **Logo removed** from sunburst center (replaced by university name)

---

## Previous session (Session 1 — 2026-05-31)

### 1. Dashboard overhaul (major)
- Built new `GET /employees/dashboard-charts` backend endpoint that aggregates all chart data in one query
- Endpoint accepts optional `?universityId=` query param for per-university filtering
- Rewrote `frontend/src/app/dashboard/page.tsx` with 7 chart sections using Recharts:
  - Stat cards (Universities, Employees, Subjects, Vacant Seats, Designations) with colored icons
  - Stacked bar: Designation distribution across universities (all universities combined)
  - Sunburst (3-ring nested pie): Subject → Designation → Post Type per university, with university logo in center
  - Category-wise designation bar chart (per selected university)
  - Employment type → designation bar chart (per selected university)
  - Gender & designation nested donut (per selected university)
  - Sanction vs present grouped bar (per selected university)
- Bottom 4 charts filter by the selected university (second API call with `?universityId=`)
- Section divider shows "University Name — Detailed Analysis"
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
- Sidebar manages its own state internally — works across all page layouts
- State persists in localStorage across sessions
- Works on all pages (Dashboard, Employees, Reports, etc.)

### 5. University logos
- 10 logos added to `frontend/public/logos/` (KUK, MDU, CDLU, CRSU, CBLU, GU, MVSU, IGU, BPSMV, DBRANLU)
- Logo shows in sunburst chart center circle; falls back to university code text when no logo
- Logo map defined in `UNI_LOGOS` constant in dashboard page

### 6. Data imports (real data from Excel files)
| University | Source File | Records |
|------------|-----------|---------|
| CDLU | `CDLU_Department_Wise_Faculty.xlsx` | 20 |
| MDU | `MDU_Detailed_Faculty_Database.xlsx` | 289 |
| GJU | `GJU_Faculty_Department_wise.xlsx` | 215 |
| CRSU | `CRSU.xlsx` | 43 |
| BPSMV | `BPSMV_Faculty_Department_Wise_2026-27.xlsx` | 338 |
| KUK | Seed data | 5 |
| **Subtotal (real)** | | **910** |

### 7. Dummy data for remaining universities
| University | Records |
|------------|---------|
| CBLU | 45 |
| GU | 55 |
| MVSU | 30 |
| IGU | 50 |
| DBRANLU | 25 |
| CCSHAU | 60 |
| DCRUST | 65 |
| SVSU | 35 |
| **Subtotal (dummy)** | **365** |

### 8. Added all 14 Haryana universities
- Created all 14 universities with admin users (password: `admin123`)
- All universities have data (real or dummy)

---

## Current state

| Item | Value |
|------|-------|
| **Live frontend** | https://frontend-production-9521.up.railway.app |
| **Live backend** | https://backend-production-7615.up.railway.app/api |
| **Swagger docs** | https://backend-production-7615.up.railway.app/api/docs |
| **Repo** | https://github.com/Rajtaya/UEMS |
| **Latest commit** | `c1ab20e` on `main` |
| **Local DB** | `postgresql://aarya@localhost:5432/kuk_portal` |
| **Railway DB** | `postgresql://postgres:FgumMmQbxvyKUnHmvEEduzmeIDBVfAvm@zephyr.proxy.rlwy.net:59171/railway` |
| **Universities** | 14 (all with data) |
| **Total employees** | 1,277 (local + Railway synced) |

---

## All 14 Universities

| Code | University | City | Admin Login | Employees | Data Type |
|------|-----------|------|-------------|-----------|-----------|
| KUK | Kurukshetra University | Kurukshetra | admin@kuk.ac.in | 5 | Seed |
| MDU | Maharshi Dayanand University | Rohtak | admin@mdu.ac.in | 290 | Real |
| CDLU | Chaudhary Devi Lal University | Sirsa | admin@cdlu.ac.in | 21 | Real |
| CRSU | Chaudhary Ranbir Singh University | Jind | admin@crsu.ac.in | 43 | Real |
| GJU | Guru Jambheshwar University of Science & Technology | Hisar | admin@gju.ac.in | 215 | Real |
| BPSMV | Bhagat Phool Singh Mahila Vishwavidyalaya | Khanpur Kalan (Sonipat) | admin@bpsmv.ac.in | 338 | Real |
| CBLU | Chaudhary Bansi Lal University | Bhiwani | admin@cblu.ac.in | 45 | Dummy |
| GU | Gurugram University | Gurugram | admin@gu.ac.in | 55 | Dummy |
| MVSU | Maharishi Valmiki Sanskrit University | Kaithal | admin@mvsu.ac.in | 30 | Dummy |
| IGU | Indira Gandhi University | Meerpur (Rewari) | admin@igu.ac.in | 50 | Dummy |
| DBRANLU | Dr. B.R. Ambedkar National Law University | Sonipat | admin@dbranlu.ac.in | 25 | Dummy |
| CCSHAU | Chaudhary Charan Singh Haryana Agricultural University | Hisar | admin@ccshau.ac.in | 60 | Dummy |
| DCRUST | Deenbandhu Chhotu Ram University of Science & Technology | Murthal (Sonipat) | admin@dcrust.ac.in | 65 | Dummy |
| SVSU | Shri Vishwakarma Skill University | Palwal | admin@svsu.ac.in | 35 | Dummy |

**Super Admin:** admin@he.haryana.gov.in / admin123
**State User:** state@he.haryana.gov.in / admin123

---

## Known issues / pending

- **Railway frontend deployments** sometimes don't pick up new code from `railway up` — may need to redeploy from Railway dashboard or trigger via `git push` + Railway auto-deploy
- **Sunburst tab click** — the Recharts SVG overlay intercepts physical clicks on the "Summary Chart" tab; works via keyboard/JS click. Real user clicks should work fine
- **4 missing logos**: GJU, CCSHAU, DCRUST, SVSU — need logo files
- **8 universities with dummy data** — replace with real Excel data when available
- **Bulk import tip**: Use `prisma.createMany({ data: [...], skipDuplicates: true })` for fast imports instead of individual upserts

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
- **Bulk data imports:** Use `prisma.createMany()` with `skipDuplicates: true` for speed — not individual upserts (network latency kills performance on Railway)
