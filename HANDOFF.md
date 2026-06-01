# UEMS Session Handoff — 2026-06-01 (Updated 2026-06-01 session 4)

## What was done this session (Session 4 — 2026-06-01)

### 15. Dashboard chart polish (major)
- **Gender chart redesign**: Independent `genderHover` state (no cross-chart interference), mouse-following tooltip using `position: fixed`, interactive two-column legend (Male/Female) with counts and percentages
- **Sunburst fixes**: Removed white gap between center circle and Ring 1 (center circle 170px overlaps Ring 1 at innerRadius=70), SVG focus outlines removed via globals.css, ring sizes optimized (Ring1: 70→160, Ring2: 160→220, Ring3: 220→290)
- **Bar chart improvements**: Custom `BarWithTopStroke` shape — white separator between stacked segments only, not on X-axis. `barSize={65}` on all charts except Sanction (20). Visible X/Y axis lines (`#374151`, 1.5px) on all charts
- **Compact tooltips**: All charts use same small tooltip style — label + colored dot + designation: **count**. No large numbers or totals
- **Legend spacing**: `paddingTop: 30` on all legends to prevent overlap with X-axis labels
- **Cursor removed**: `cursor={false}` on all tooltips — no gray vertical highlight bar

### 16. Data consistency overhaul
- **Removed DBRANLU and SVSU** — now 12 universities (was 14)
- **Sanction posts for ALL universities**: Generated sanction posts per subject/designation (sanction = present + 1-3 vacancies). 431 total sanction posts
- **Realistic dummy data**: Re-generated employees for 6 dummy universities (CBLU, CCSHAU, GU, IGU, MVSU, DCRUST) with weighted distributions — 50% Asst Prof, 25% Assoc Prof, 15% Prof, 10% Senior Prof; 60/40 M/F; varied categories and post types
- **Subject name cleanup**: Removed "Department of" / "Dept." prefix from all subject names in employees, sanctioned_posts, and departments tables

### 17. Deployment & PWA
- **CORS fix**: Backend `origin: true` (allow all origins)
- **Frontend `.env.production`**: `NEXT_PUBLIC_API_URL=https://backend-production-7615.up.railway.app/api`
- **PWA enabled**: manifest.json, service worker (network-first caching), SVG app icons (192/512px), Apple web app meta tags, auto service worker registration
- **Railway deploy**: Both frontend + backend deployed, DB synced

---

## Previous sessions

### Session 3 — 2026-06-01 (earlier)
- Deployment & CORS fixes, TypeScript build fixes, initial Railway redeploy

### Session 2 — 2026-05-31
- Dashboard overhaul: 7 chart sections (Recharts), sunburst with drill-down, series-level hover highlight, custom tooltips, collapsible sidebar, university logos
- Employees page: column show/hide, 6-filter panel, breadcrumb, alternating rows
- Layout fixes: sticky sidebar, overflow-x fix, Next.js proxy fix

### Session 1 — 2026-05-31
- Full dashboard backend endpoint, employees page redesign, collapsible sidebar
- University logos, data imports (MDU, GJU, CRSU, BPSMV, CDLU from Excel)
- All 14 Haryana universities created, dummy data for remaining

---

## Current state

| Item | Value |
|------|-------|
| **Live frontend** | https://uems.up.railway.app |
| **Live backend** | https://backend-production-7615.up.railway.app/api |
| **Swagger docs** | https://backend-production-7615.up.railway.app/api/docs |
| **Repo** | https://github.com/Rajtaya/kuk-portal |
| **Latest commit** | `5fe0974` on `main` |
| **Local DB** | `postgresql://aarya@localhost:5432/kuk_portal` |
| **Railway DB** | `postgresql://postgres:FgumMmQbxvyKUnHmvEEduzmeIDBVfAvm@zephyr.proxy.rlwy.net:59171/railway` |
| **Universities** | 12 |
| **Total employees** | 1,328 |
| **Total sanction posts** | 431 |
| **Chart library** | ECharts (`echarts-for-react`) — migrated from Recharts |
| **PWA** | Enabled (manifest + service worker) |

---

## All 12 Universities

| Code | University | City | Admin Login | Employees | Sanction Posts | Data Type |
|------|-----------|------|-------------|-----------|----------------|-----------|
| KUK | Kurukshetra University | Kurukshetra | admin@kuk.ac.in | 86 | 75 | Seed+Dummy |
| MDU | Maharshi Dayanand University | Rohtak | admin@mdu.ac.in | 290 | 103 | Real |
| CDLU | Chaudhary Devi Lal University | Sirsa | admin@cdlu.ac.in | 21 | 9 | Real |
| CRSU | Chaudhary Ranbir Singh University | Jind | admin@crsu.ac.in | 43 | 27 | Real |
| GJU | Guru Jambheshwar University of Science & Technology | Hisar | admin@gju.ac.in | 215 | 63 | Real |
| BPSMV | Bhagat Phool Singh Mahila Vishwavidyalaya | Khanpur Kalan (Sonipat) | admin@bpsmv.ac.in | 338 | 64 | Real |
| CBLU | Chaudhary Bansi Lal University | Bhiwani | admin@cblu.ac.in | 55 | 15 | Dummy |
| GU | Gurugram University | Gurugram | admin@gu.ac.in | 54 | 15 | Dummy |
| MVSU | Maharishi Valmiki Sanskrit University | Kaithal | admin@mvsu.ac.in | 40 | 15 | Dummy |
| IGU | Indira Gandhi University | Meerpur (Rewari) | admin@igu.ac.in | 60 | 15 | Dummy |
| CCSHAU | Chaudhary Charan Singh Haryana Agricultural University | Hisar | admin@ccshau.ac.in | 66 | 15 | Dummy |
| DCRUST | Deenbandhu Chhotu Ram University of Science & Technology | Murthal (Sonipat) | admin@dcrust.ac.in | 60 | 15 | Dummy |

**Super Admin:** admin@he.haryana.gov.in / admin123
**State User:** state@he.haryana.gov.in / admin123

---

## Completed: ECharts migration (Session 5 — 2026-06-01)

Replaced all 7 Recharts chart sections with ECharts (`echarts-for-react`):
1. Employee Distribution (stacked bar) — ECharts with emphasis highlight, total labels
2. Sunburst — **native ECharts sunburst** with built-in drill-down (`nodeClick: 'rootToNode'`), replaced 3-ring Pie hack + manual drill state
3. Summary bar chart — ECharts stacked bar with dataZoom for many subjects
4. Category-wise bar chart — ECharts stacked bar
5. Employment Type bar chart — ECharts stacked bar
6. Gender donut (nested pie) — ECharts with `dispatchAction` highlight from custom legend
7. Sanction vs Present (grouped-stacked bar) — two stack groups with total labels

**Key improvements:** ~40% less code (1115→~520 lines), removed all manual hover state management (`hoveredKey`, `genderHover`, `genderMouse`, `legendHover`), removed `BarWithTopStroke`/`HoverOnlyTooltip`/`makePieLabel` components, replaced manual drill-down state with native sunburst drill-down, smooth animations, canvas-based image export

**Note:** Recharts is still in package.json but unused — can be removed with `npm uninstall recharts`

---

## Known issues / pending

- **2 missing logos**: CCSHAU, DCRUST — need logo files
- **6 universities with dummy data** — replace with real Excel data when available

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
- **Frontend env for Railway:** `NEXT_PUBLIC_API_URL` must be set as Docker build arg (baked at build time, not runtime). Also set in `.env.production`
- **Deploy frontend:** `railway up -s frontend` from project root. If build fails, check TS errors first
- **DB sync:** `pg_dump` local → `pg_restore` to Railway. Always use `--clean --if-exists --no-owner --no-acl`
