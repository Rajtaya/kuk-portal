# UEMS Session Handoff — 2026-06-02 (Updated 2026-06-02 session 7)

> ## ⚠️ HIGHLIGHTED DATA NOTE — `Employee.subject` is unnormalized free-text
>
> **Discovered 2026-06-02 while scoping the dashboard stat cards per university.**
>
> - The employee `subject` field is **free-text**, not constrained to the `Subject` master table.
> - **110 distinct** subject strings exist across employee records, vs **43** rows in the `Subject` master.
> - **Consequence:** the dashboard "Subjects" stat card now reflects the selected university
>   (distinct subjects among that university's employees), but the **global** card still shows the
>   master count (43). So a single university can read **higher** than the global total
>   (e.g. **MDU = 58 subjects** vs global **43**) — a child exceeding its parent.
> - **Decision (per user):** keep current behavior (per-university distinct; global = 43 master) and
>   track this here rather than changing it now.
> - **Real fix (future):** normalize `Employee.subject` to the `Subject` master (dedupe variants/typos,
>   map free-text → master ids), then both global and per-university counts become consistent.
>   Alternatively, switch every count to "distinct-in-records" (global would then show ~110).

## What was done this session (Session 7 — 2026-06-02)

> Session 6 (2026-06-02, UI/UX batches 1–2: commits `e775cd7`, `089f4dc`) is logged separately in `HANDOFF_busy _error.md`.

### 26. UI/UX feature pass (commit `cb4baf2`)
- **Dark mode** — class-based Tailwind (`darkMode: 'class'`), `DarkModeProvider`/`useDarkMode` (`src/lib/dark-mode-context.tsx`), FOUC-prevention script in root layout, toggle in the sidebar footer + mobile top bar. Dark coverage across shared components and all main pages. **Dashboard ECharts cards intentionally kept light** (axis/label colors are tuned for a light background).
- **Cmd/Ctrl+K command palette** (`src/components/ui/command-palette.tsx`) — role-aware navigation + theme/logout actions.
- **Empty states** (`src/components/ui/empty-state.tsx`) — wired into the shared `DataTable` and the employees / sanctioned-posts / reports / users lists.
- **Mobile card view** — shared `DataTable` renders cards below the `md` breakpoint.
- **Export** (`src/lib/export-utils.ts`) — CSV, Excel (via the already-installed `xlsx`), and PDF (dependency-free browser print window; no jsPDF). Wired into employees, the sanctioned-posts vacancy report, and reports.

### 27. Dashboard interactivity & chart fixes
- **Click-to-drill (`be624e7`)** — clicking a university's bar in the main "Employee Distribution by Designation" chart resolves that university and sets `selectedUni`, so the dropdown + every drill-down chart switch to it. No-op for University Admins.
- **Sunburst outer labels (`fb5262d`)** — the designation (46–70%) and post-type (70–92%) rings were `label:{show:false}`; re-enabled radial labels with a `minAngle` declutter threshold, truncation, and a text outline.
- **Category chart labels (`73a8b20`)** — the Category-wise x-axis had no `interval`, so ECharts auto-hid some labels; set `interval:0` + rotation + wider bottom grid so all categories show.
- **Top stat cards reflect the selected university (`217cdfc`)** — backend `dashboard-charts` now scopes `subjectCount`/`designationCount` to the selected university (global keeps master counts); frontend cards read the selected university's stats; added a "Showing data for <University>" scope chip with a "View all universities" reset. **See the highlighted DATA NOTE at the top** re: free-text `Employee.subject`.

### 28. Removed OBC category — Haryana has no OBC (commit `0ba6d8f`)
- Haryana uses **BC-A** and **BC-B**, not OBC. Removed `OBC` from the Prisma `Category` enum, backend bulk-upload validation, the frontend `Category` type, the employee filter + add-employee dropdowns, and the badge color map.
- **Data migration (local + Railway):** the **234** employees categorized OBC in *each* of `category` and `categorySelection` were **split evenly into BC-A / BC-B** (Postgres won't drop an in-use enum value, so data was remapped first). Railway's startup `prisma db push --accept-data-loss` then dropped the enum value on deploy.
- **Verified live:** Railway `Category` enum is now `GENERAL,SC,ST,EWS,BCA,BCB,PWD,ESM`.
- **Related, NOT done:** Haryana also has **no ST** category (0 ST rows; the `ST` enum value is unused but left in place). Remove the same way if desired.

### Local-dev notes (this session)
- The `:3000` server was a **production build baked to the Railway API** — restarted it as a clean `next dev` (with `NEXT_PUBLIC_API_URL` unset) so it proxies `/api` → local `:4000`. Backend runs the **compiled** `node dist/src/main.js` (not watch); rebuild with `./node_modules/.bin/tsc -p tsconfig.json` (the `nest` CLI was broken by two corrupted `node_modules` packages — `semver`, `magic-string` — fixed via `rm -rf node_modules/<pkg> && npm install`).
- **Gotcha:** running `next build` while `next dev` is up clobbers the dev server's `.next` (blank pages). If that happens: kill `:3000`, `rm -rf .next`, restart `next dev`.

## What was done in Session 5 — 2026-06-01

### 18. ECharts migration (major)
- Replaced all 7 Recharts chart sections with ECharts (`echarts-for-react`). ~40% less code (1115→~520 lines), native sunburst with built-in drill-down, removed all manual hover state. See detailed notes further down.

### 19. Chart refinements
- **Sanction vs Present tooltip**: side-by-side comparison — hovering a bar shows both Sanction and Present values for that designation + total
- **Sunburst tooltip**: repositioned above cursor (was hidden behind center circle), then simplified to just `name: value` (no path breadcrumb)
- **Sunburst labels**: center text horizontal (`rotate: 0`), subject ring labels radial for readability, outer rings label-less
- **Gender chart**: redesigned to match reference — tight nested rings (inner 15-44%, outer 46-72%), 3px white borders, designation labels with pointer lines, wider inner ring so "Female" is fully visible, scale-up emphasis on hover, gentler blur (0.4)

### 20. Data fixes
- **"Dept." prefix removed** from subjects in employees, sanctioned_posts, departments (both local + Railway DB). Merged duplicate departments
- **KUK subject renames**: Electronics & Communication → Electronics, Computer Science & Applications → Computer Science, English & Foreign Languages → English (KUK only, both DBs)
- **All 12 university logos added** — GJU, CCSHAU, DCRUST were missing (from Archive.zip). Removed DBRANLU logo

### 21. UI redesign / beautification
- **Sidebar**: dark gradient theme (slate-900), colored gradient icon badges per section, active indicator bar, user avatar initial. **3-mode toggle**: expanded → collapsed (icons) → hidden (off-screen, with a floating reveal tab). State persisted in localStorage
- **Reports page**: gradient icon cards with hover lift, **search filter** across all columns, **sortable columns** (click headers), row numbers, dark header bar, record-count footer, alternating rows
- **Universities page**: logo cards, gradient code badges, stat boxes, hover lift; **sort by Departments/Employees/Name** (default Departments desc) with direction toggle; **cards are clickable** → open official university website in new tab (all 12 URLs verified)
- **Numeric columns center-aligned** (H + V) across all data tables: reports, sanctioned posts, dashboard data table, employees

### 22. Repo migration + deployment fixes
- **New GitHub repo**: `Rajtaya/kuk-portal` (migrated from `Rajtaya/UEMS`). `origin` now points here
- **ROOT CAUSE of stale deploys found**: `railway up` was being run from `/Users/aarya` (home) instead of the project root — uploading wrong files. Always `cd` to project root first
- **CDN cache fix**: pages were cached by Railway edge for 1 year (`s-maxage=31536000`). Added `export const dynamic = 'force-dynamic'` to root layout + `Cache-Control: no-cache` headers in next.config.ts
- **Dockerfile fix**: added `COPY --from=builder /app/public ./public` — logos/icons were 404'ing in production (standalone build doesn't auto-copy public/)
- **TS build fix**: `postTypeDesignation` row typed as `Record<string, any>[]`
- **Auto-deploy enabled** — `git push` to `main` auto-deploys both services on Railway

---

## What was done in Session 4 — 2026-06-01

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
| **Latest commit** | `0ba6d8f` on `main` (session 7 — OBC category removed) |
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

- **All 12 logos present** ✓ (fixed session 5)
- **6 universities with dummy data** — replace with real Excel data when available (CBLU, GU, MVSU, IGU, CCSHAU, DCRUST)

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
- **Deploy frontend:** `railway up -s frontend` **from `/Users/aarya/Desktop/KUKPortal/kuk-portal` (project root)**. ⚠️ Running from the wrong cwd uploads stale files and the deploy silently uses old code — this caused hours of "why isn't it updating" confusion in session 5. Always `cd` to project root first. If build fails, check TS errors first
- **Railway CDN cache:** edge caches pages aggressively. Root layout has `export const dynamic = 'force-dynamic'` + `Cache-Control: no-cache` in next.config.ts to prevent stale pages. Don't remove these
- **Dockerfile must copy public/:** standalone Next.js build does NOT auto-include `public/`. Dockerfile has `COPY --from=builder /app/public ./public` — without it, logos/icons 404 in production
- **Auto-deploy enabled** — `git push` to `main` auto-deploys both services on Railway
- **DB sync:** `pg_dump` local → `pg_restore` to Railway. Always use `--clean --if-exists --no-owner --no-acl`. Railway DB creds in Current state table above
