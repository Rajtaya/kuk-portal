'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { exportToCSV, exportToExcel, exportToPDF, ExportColumn } from '@/lib/export-utils';
import { Workbook } from 'exceljs';

interface VacancyRow {
  id: string;
  university: string;
  universityCode: string;
  department: string;
  subject?: string;
  designation: string;
  postType: string;
  sanctioned: number;
  filled: number;
  vacant: number;
  excess: number;
}

const postTypes = ['BUDGETED', 'SFS', 'CONTRACTUAL'];

export default function SanctionedPostsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isStateUser = user?.role === 'STATE_USER';
  const isUniversityAdmin = user?.role === 'UNIVERSITY_ADMIN';
  const canWrite = isSuperAdmin || isUniversityAdmin;
  const { toast } = useToast();

  const [vacancyData, setVacancyData] = useState<VacancyRow[]>([]);
  const [universities, setUniversities] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Import modal
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importUniversityId, setImportUniversityId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState<{ success: number; failed: number; total: number; errors: string[] } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    if (isSuperAdmin || isStateUser) {
      api.get<{ id: string; name: string; code: string }[]>('/universities').then(setUniversities);
    }
  }, [isSuperAdmin, isStateUser]);

  // Deep-link from the Universities page: /sanctioned-posts?university=CODE pre-filters to that university.
  useEffect(() => {
    const uni = new URLSearchParams(window.location.search).get('university');
    if (uni) setFilters((prev) => ({ ...prev, university: uni }));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function loadData() {
    setLoading(true);
    api.get<VacancyRow[]>('/sanctioned-posts/vacancy-report')
      .then(setVacancyData)
      .finally(() => setLoading(false));
  }

  // Import (bulk upload) — same columns the backend's bulkImport expects.
  function openImport() {
    setImportFile(null); setImportError(''); setImportResult(null); setImportUniversityId('');
    if (importFileRef.current) importFileRef.current.value = '';
    setShowImport(true);
  }

  async function downloadTemplate() {
    const headers = ['Department', 'Subject', 'Designation', 'Type', 'Sanctioned Posts'];
    const sampleRows = [
      ['Computer Science', 'Computer Science', 'Professor', 'BUDGETED', 2],
      ['Computer Science', 'Computer Science', 'Associate Professor', 'BUDGETED', 4],
      ['Physics', 'Physics', 'Assistant Professor', 'SFS', 6],
    ];
    const wb = new Workbook();
    const ws = wb.addWorksheet('Template');
    ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(h.length + 2, 18) }));
    sampleRows.forEach((r) => ws.addRow(r));
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sanctioned-posts-template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) { setImportError('Only .xlsx, .xls, .csv supported'); return; }
    setImportFile(f); setImportError(''); setImportResult(null);
  }

  async function handleImport() {
    if (!importFile) { setImportError('Please select a file'); return; }
    const uid = isSuperAdmin ? importUniversityId : (user?.university?.id || '');
    if (!uid) { setImportError('Please select a university'); return; }
    setImporting(true); setImportError('');
    try {
      const res = await api.uploadFile<{ success: number; failed: number; total: number; errors: string[] }>(
        '/sanctioned-posts/bulk-upload', importFile, { universityId: uid },
      );
      setImportResult(res);
      loadData();
    } catch (err: any) { setImportError(err.message || 'Import failed'); }
    finally { setImporting(false); }
  }

  // University filter (stat cards + table) — driven by filter panel
  const uniOnlyVacancy = useMemo(() => {
    if (!filters.university) return vacancyData;
    return vacancyData.filter(r => r.universityCode === filters.university);
  }, [vacancyData, filters.university]);

  const uniFilteredVacancy = uniOnlyVacancy;

  const totals = uniOnlyVacancy.reduce(
    (acc, r) => ({ sanctioned: acc.sanctioned + r.sanctioned, filled: acc.filled + r.filled, vacant: acc.vacant + r.vacant, excess: acc.excess + (r.excess || 0) }),
    { sanctioned: 0, filled: 0, vacant: 0, excess: 0 },
  );

  // Headline box figures — ALL derived from the vacancy report (the same source as the table's
  // "Total" row), so the boxes and the list can't disagree. Budgeted + SFS only (no contractual).
  const sumVac = (pt: 'BUDGETED' | 'SFS') => uniOnlyVacancy
    .filter(r => r.postType === pt)
    .reduce((a, r) => ({ sanctioned: a.sanctioned + r.sanctioned, filled: a.filled + r.filled, vacant: a.vacant + r.vacant }), { sanctioned: 0, filled: 0, vacant: 0 });
  const vBudg = sumVac('BUDGETED');
  const vSfs  = sumVac('SFS');
  const boxSanctionedBudgeted = vBudg.sanctioned;
  const boxSanctionedSfs      = vSfs.sanctioned;
  const boxSanctionedTotal    = boxSanctionedBudgeted + boxSanctionedSfs;
  const boxFilledBudgeted = vBudg.filled;
  const boxFilledSfs      = vSfs.filled;
  const boxFilledTotal    = boxFilledBudgeted + boxFilledSfs;
  const boxVacantBudgeted = vBudg.vacant;
  const boxVacantSfs      = vSfs.vacant;
  const boxVacantTotal    = boxVacantBudgeted + boxVacantSfs;

  // Available filter options. Subject/Designation/Department cascade off the other active
  // filters, so picking a university narrows them to that university's values (and so on).
  const availableFilters = useMemo(() => {
    if (!vacancyData.length) return [];
    const defs: { key: string; label: string; values: string[] }[] = [];

    // Rows matching every active filter EXCEPT the given key.
    const rowsExcept = (key: string) => vacancyData.filter(r =>
      Object.entries(filters).every(([k, v]) => {
        if (!v || k === key) return true;
        if (k === 'university') return r.universityCode === v;
        if (k === 'designation') return r.designation === v;
        if (k === 'postType') return r.postType === v;
        if (k === 'subject') return (r.subject || '') === v;
        if (k === 'department') return r.department === v;
        return true;
      })
    );

    if (isSuperAdmin || isStateUser) {
      const unis = [...new Set(vacancyData.map(r => r.universityCode))].sort();
      if (unis.length > 1) defs.push({ key: 'university', label: 'University', values: unis });
    }

    const subs = [...new Set(rowsExcept('subject').map(r => r.subject).filter(Boolean) as string[])].sort();
    if (subs.length) defs.push({ key: 'subject', label: 'Subject', values: subs });

    const desigs = [...new Set(rowsExcept('designation').map(r => r.designation))].sort();
    if (desigs.length > 1) defs.push({ key: 'designation', label: 'Designation', values: desigs });

    const depts = [...new Set(rowsExcept('department').map(r => r.department).filter(Boolean))].sort();
    if (depts.length > 1) defs.push({ key: 'department', label: 'Department', values: depts });

    defs.push({ key: 'postType', label: 'Post Type', values: [...postTypes] });

    return defs;
  }, [vacancyData, isSuperAdmin, isStateUser, filters]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  function clearAllFilters() { setFilters({}); setSearch(''); }

  // Apply a single filter. Changing the university resets the sub-filters that were
  // scoped to it, so you never end up with a selection that no longer exists.
  function onFilterChange(key: string, value: string) {
    setFilters((prev) => {
      const next: Record<string, string> = { ...prev };
      if (value) next[key] = value; else delete next[key];
      if (key === 'university') { delete next.subject; delete next.designation; delete next.department; }
      return next;
    });
  }

  function matchesFilters(row: VacancyRow): boolean {
    return Object.entries(filters).every(([key, val]) => {
      if (!val) return true;
      if (key === 'university') return row.universityCode === val;
      if (key === 'designation') return row.designation === val;
      if (key === 'postType') return row.postType === val;
      if (key === 'subject') return (row.subject || '') === val;
      if (key === 'department') return row.department === val;
      return true;
    });
  }

  // Filtered + sorted vacancy data
  const filteredVacancy = useMemo(() => {
    let data = uniFilteredVacancy.filter(r => matchesFilters(r));
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        [r.universityCode, r.university, r.department, r.subject, r.designation, r.postType]
          .some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }
    return data;
  }, [uniFilteredVacancy, search, filters]);

  // Footer "Total" row sums the filtered rows so it matches the visible table.
  const filteredTotals = filteredVacancy.reduce(
    (acc, r) => ({ sanctioned: acc.sanctioned + r.sanctioned, filled: acc.filled + r.filled, vacant: acc.vacant + r.vacant, excess: acc.excess + (r.excess || 0) }),
    { sanctioned: 0, filled: 0, vacant: 0, excess: 0 },
  );
  const filteredFillRate = filteredTotals.sanctioned > 0 ? Math.round((filteredTotals.filled / filteredTotals.sanctioned) * 100) : 0;

  const numericCols = new Set(['sanctioned', 'filled', 'vacant', 'excess', 'fillRate']);

  const vacancyExportCols: ExportColumn[] = [
    ...((isSuperAdmin || isStateUser) ? [{ key: 'university', label: 'University Name' }] : []),
    { key: 'subject', label: 'Subject' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'postType', label: 'Type' },
    { key: 'sanctioned', label: 'Sanctioned' },
    { key: 'filled', label: 'Filled' },
    { key: 'vacant', label: 'Vacant' },
    { key: 'excess', label: 'Excess', value: (r) => r.excess || 0 },
  ];

  function doExport(fmt: 'csv' | 'excel' | 'pdf') {
    const data = filteredVacancy;
    if (!data.length) { toast('Nothing to export', 'error'); return; }
    setExportOpen(false);
    if (fmt === 'csv') exportToCSV('vacancy-report', vacancyExportCols, data);
    else if (fmt === 'excel') exportToExcel('vacancy-report', vacancyExportCols, data);
    else exportToPDF('Vacancy Report', vacancyExportCols, data);
  }

  // Unique filter options from the (optionally university-filtered) data
  const filterSubjects = useMemo(() => [...new Set(uniFilteredVacancy.map(r => r.subject).filter(Boolean) as string[])].sort(), [uniFilteredVacancy]);
  const filterDepts = useMemo(() => [...new Set(uniFilteredVacancy.map(r => r.department).filter(Boolean))].sort(), [uniFilteredVacancy]);
  const filterDesigs = useMemo(() => [...new Set(uniFilteredVacancy.map(r => r.designation))].sort(), [uniFilteredVacancy]);

  const activeCount = filteredVacancy.length;
  const totalCount = uniFilteredVacancy.length;

  return (
    <div>
      {/* Single toolbar row: title · filter · Total · Budgeted · SFS · search · import · export */}
      <div className="flex flex-wrap items-center gap-2 py-1">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap shrink-0">Sanctioned Posts</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-primary-100 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          title="Toggle filters"
        >
          <svg className={`w-5 h-5 ${showFilters || activeFilterCount > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          {activeFilterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center font-bold">{activeFilterCount}</span>
          )}
        </button>

        {[
          { title: 'Total',    tip: 'Budgeted + SFS combined',       accent: 'text-gray-600 dark:text-gray-300',   data: { total: boxSanctionedTotal,    filled: boxFilledTotal,    vacant: boxVacantTotal    } },
          { title: 'Budgeted', tip: 'Government-funded posts',      accent: 'text-indigo-700 dark:text-indigo-300', data: { total: boxSanctionedBudgeted, filled: boxFilledBudgeted, vacant: boxVacantBudgeted } },
          { title: 'SFS',      tip: 'Self-Financed Scheme posts',   accent: 'text-orange-700 dark:text-orange-300', data: { total: boxSanctionedSfs,      filled: boxFilledSfs,      vacant: boxVacantSfs      } },
        ].map((box) => (
          <div key={box.title} title={box.tip} className="flex w-full md:w-auto md:shrink-0 md:inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2.5 py-1.5 whitespace-nowrap">
            <span className={`shrink-0 w-[72px] md:w-auto text-[11px] font-bold uppercase tracking-wide ${box.accent}`}>{box.title}</span>
            {[
              { label: 'Total', tip: 'Sanctioned — approved positions', value: box.data.total, grad: 'from-blue-500 to-blue-700' },
              { label: 'Filled', tip: 'Currently occupied', value: box.data.filled, grad: 'from-emerald-500 to-emerald-700' },
              { label: box.data.total > 0 ? `Vacant(${Math.round((box.data.vacant / box.data.total) * 100)}%)` : 'Vacant', tip: 'Unfilled (Sanctioned − Filled)', value: box.data.vacant, grad: 'from-red-500 to-red-700' },
            ].map((m) => (
              <span key={m.label} title={m.tip} className={`flex-1 md:flex-none inline-flex flex-col items-center justify-center leading-none px-2.5 py-1 bg-gradient-to-br ${m.grad} shadow-[2px_2px_0_0_rgba(28,25,23,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.05] hover:shadow-[4px_4px_0_0_rgba(28,25,23,0.5)]`}>
                <span className="text-sm font-bold tabular-nums text-white">{m.value.toLocaleString()}</span>
                <span className="text-[9px] uppercase tracking-wide text-white/80 mt-0.5">{m.label}</span>
              </span>
            ))}
          </div>
        ))}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-28 pl-8 pr-7 py-1.5 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {canWrite && (
            <button onClick={openImport} className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Import
            </button>
          )}

          <div className="relative" ref={exportRef}>
              <button onClick={() => setExportOpen(!exportOpen)} disabled={!vacancyData.length} className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 w-40">
                  <button onClick={() => doExport('csv')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">CSV (.csv)</button>
                  <button onClick={() => doExport('excel')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Excel (.xlsx)</button>
                  <button onClick={() => doExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">PDF (print)</button>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Filter sidebar — slides in from left, overlays content */}
      {showFilters && <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={() => setShowFilters(false)} />}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${showFilters ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-2 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filters</h3>
          <button onClick={() => setShowFilters(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-5">
            {availableFilters.map(f => (
              <div key={f.key} className="relative">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{f.label}</label>
                <select
                  value={filters[f.key] || ''}
                  onChange={(e) => onFilterChange(f.key, e.target.value)}
                  className={`w-full px-3 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all appearance-none pr-8 ${
                    filters[f.key]
                      ? 'border-gray-900 dark:border-gray-200 text-gray-900 dark:text-gray-100 font-medium'
                      : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <option value="">{f.label}</option>
                  {f.values.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                {filters[f.key] ? (
                  <button
                    onClick={() => onFilterChange(f.key, '')}
                    className="absolute right-2.5 bottom-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : (
                  <svg className="absolute right-2.5 bottom-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <button onClick={clearAllFilters} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">RESET</button>
            <button onClick={() => setShowFilters(false)} className="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">APPLY</button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="mt-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading ? (
          <TableSkeleton rows={8} cols={9} />
        ) : filteredVacancy.length === 0 ? (
          <EmptyState
            icon={search ? '🔍' : '📊'}
            title={search ? 'No matching records' : 'No vacancy data'}
            description={search ? 'Try a different search term.' : 'Vacancy figures appear once sanctioned posts and employees are recorded.'}
          />
        ) : (
          <>
          {/* Desktop: full data table (scrolls horizontally on smaller widths) */}
          <div className="hidden md:block overflow-auto max-h-[70vh]">
            <style>{`
              .sp-header-select option { color: #1f2937; background: #fff; font-size: 13px; padding: 6px 10px; font-weight: 500; text-transform: none; letter-spacing: 0; }
              .sp-header-select option:checked { background: #e0e7ff; color: #3730a3; }
              .sp-header-select option:hover { background: #f3f4f6; }
              @media (prefers-color-scheme: dark) { .sp-header-select option { color: #e5e7eb; background: #1f2937; } .sp-header-select option:checked { background: #312e81; color: #c7d2fe; } }
            `}</style>
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                {(() => {
                  const scls = 'sp-header-select w-full pl-1.5 pr-6 py-1.5 text-[12px] font-semibold bg-white/15 text-white border border-white/25 rounded focus:outline-none focus:ring-1 focus:ring-white/40 cursor-pointer appearance-none uppercase tracking-wide bg-no-repeat bg-[length:14px_14px] bg-[position:right_6px_center]';
                  const filterIcon = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.7)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3'/%3E%3C/svg%3E")` };
                  const thCls = (numeric?: boolean) => `sticky top-0 z-10 bg-primary-700 px-1.5 py-2 align-middle font-semibold text-xs uppercase tracking-wide border border-gray-300 dark:border-gray-600 ${numeric ? 'text-center' : 'text-left'}`;
                  const plain = (label: string) => <span className="px-1 text-white">{label}</span>;
                  return (
                    <tr className="bg-primary-700 text-white">
                      <th className={thCls(true) + ' w-10'}>{plain('#')}</th>
                      {(isSuperAdmin || isStateUser) && (
                        <th className={thCls()}>
                          <select value={filters.university || ''} onChange={(e) => onFilterChange('university', e.target.value)} className={scls} style={filterIcon}>
                            <option value="">University</option>
                            {universities.map(u => <option key={u.id} value={u.code}>{u.name}</option>)}
                          </select>
                        </th>
                      )}
                      <th className={thCls()}>
                        <select value={filters.subject || ''} onChange={(e) => onFilterChange('subject', e.target.value)} className={scls} style={filterIcon}>
                          <option value="">Subject</option>
                          {filterSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </th>
                      <th className={thCls()}>
                        <select value={filters.department || ''} onChange={(e) => onFilterChange('department', e.target.value)} className={scls} style={filterIcon}>
                          <option value="">Department</option>
                          {filterDepts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </th>
                      <th className={thCls()}>
                        <select value={filters.designation || ''} onChange={(e) => onFilterChange('designation', e.target.value)} className={scls} style={filterIcon}>
                          <option value="">Designation</option>
                          {filterDesigs.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </th>
                      <th className={thCls()}>
                        <select value={filters.postType || ''} onChange={(e) => onFilterChange('postType', e.target.value)} className={scls} style={filterIcon}>
                          <option value="">Type</option>
                          <option value="BUDGETED">Budgeted</option>
                          <option value="SFS">SFS</option>
                          <option value="CONTRACTUAL">Contractual</option>
                        </select>
                      </th>
                      <th className={thCls(true)}>{plain('Sanctioned')}</th>
                      <th className={thCls(true)}>{plain('Filled')}</th>
                      <th className={thCls(true)}>{plain('Vacant')}</th>
                      <th className={thCls(true)}>{plain('Excess')}</th>
                      <th className={thCls(true)}>{plain('Fill %')}</th>
                    </tr>
                  );
                })()}
              </thead>
              <tbody>
                {filteredVacancy.map((row, i) => {
                  const rowFill = row.sanctioned > 0 ? Math.round((row.filled / row.sanctioned) * 100) : 0;
                  const vacantPct = row.sanctioned > 0 ? row.vacant / row.sanctioned : 0;
                  return (
                    <tr key={row.id} className={`border-b border-gray-50 dark:border-gray-800 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'} hover:bg-primary-50/40 dark:hover:bg-gray-800/60`}>
                      <td className="px-2 py-3 text-center align-middle text-gray-400 text-xs font-mono border border-gray-200 dark:border-gray-700">{i + 1}</td>
                      {(isSuperAdmin || isStateUser) && <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">{row.university}</td>}
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{row.subject || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{row.department}</td>
                      <td className="px-3 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap border border-gray-200 dark:border-gray-700">{row.designation}</td>
                      <td className="px-2 py-3 border border-gray-200 dark:border-gray-700"><Badge value={row.postType} /></td>
                      <td className="px-2 py-3 text-center align-middle font-semibold text-blue-700 dark:text-blue-400 tabular-nums border border-gray-200 dark:border-gray-700">{row.sanctioned}</td>
                      <td className="px-2 py-3 text-center align-middle font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums border border-gray-200 dark:border-gray-700">{row.filled}</td>
                      <td className={`px-2 py-3 text-center align-middle font-semibold tabular-nums border border-gray-200 dark:border-gray-700 ${row.vacant > 0 ? (vacantPct >= 0.5 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-orange-50 dark:bg-orange-500/5') : ''}`}>
                        {row.vacant > 0 ? <span className={vacantPct >= 0.5 ? 'text-red-700 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}>{row.vacant}</span> : <span className="text-gray-400">0</span>}
                      </td>
                      <td className="px-2 py-3 text-center align-middle font-semibold tabular-nums border border-gray-200 dark:border-gray-700">
                        {(row.excess || 0) > 0 ? <span className="text-amber-700 dark:text-amber-400">{row.excess}</span> : <span className="text-gray-400">0</span>}
                      </td>
                      <td className="px-3 py-3 text-center align-middle border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="w-14 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${rowFill >= 75 ? 'bg-emerald-500' : rowFill >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(rowFill, 100)}%` }} />
                          </div>
                          <span className={`text-xs font-medium tabular-nums ${rowFill >= 75 ? 'text-emerald-600 dark:text-emerald-400' : rowFill >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{rowFill}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-gray-800/60 border-t-2 border-slate-300 dark:border-gray-700 font-bold text-gray-900 dark:text-gray-100">
                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-700" />
                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-700" colSpan={(isSuperAdmin || isStateUser) ? 5 : 4}>Total</td>
                  <td className="px-4 py-3 text-center text-blue-700 dark:text-blue-400 tabular-nums border border-gray-200 dark:border-gray-700">{filteredTotals.sanctioned.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-emerald-700 dark:text-emerald-400 tabular-nums border border-gray-200 dark:border-gray-700">{filteredTotals.filled.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-red-700 dark:text-red-400 tabular-nums border border-gray-200 dark:border-gray-700">{filteredTotals.vacant.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-amber-700 dark:text-amber-400 tabular-nums border border-gray-200 dark:border-gray-700">{filteredTotals.excess.toLocaleString()}</td>
                  <td className={`px-3 py-3 text-center text-sm font-bold tabular-nums border border-gray-200 dark:border-gray-700 ${filteredFillRate >= 75 ? 'text-emerald-600 dark:text-emerald-400' : filteredFillRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{filteredFillRate}%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile: card view — the 11-column table scrolls sideways on phones, so each
              vacancy row becomes a self-contained card (same data, zero horizontal scroll). */}
          <div className="md:hidden p-3 space-y-3 max-h-[72vh] overflow-y-auto">
            {/* Totals first, so the headline figures are visible without scrolling the list */}
            <div className="bg-slate-50 dark:bg-gray-800/60 rounded-xl border border-slate-200 dark:border-gray-700 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">Total · {activeCount} rows</span>
                <span className={`text-xs font-bold tabular-nums ${filteredFillRate >= 75 ? 'text-emerald-600 dark:text-emerald-400' : filteredFillRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{filteredFillRate}% filled</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                <div><p className="text-base font-bold tabular-nums text-blue-700 dark:text-blue-400">{filteredTotals.sanctioned.toLocaleString()}</p><p className="text-[10px] uppercase tracking-wide text-gray-500">Sanctioned</p></div>
                <div><p className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{filteredTotals.filled.toLocaleString()}</p><p className="text-[10px] uppercase tracking-wide text-gray-500">Filled</p></div>
                <div><p className="text-base font-bold tabular-nums text-red-700 dark:text-red-400">{filteredTotals.vacant.toLocaleString()}</p><p className="text-[10px] uppercase tracking-wide text-gray-500">Vacant</p></div>
              </div>
            </div>

            {filteredVacancy.map((row) => {
              const rowFill = row.sanctioned > 0 ? Math.round((row.filled / row.sanctioned) * 100) : 0;
              const vacantPct = row.sanctioned > 0 ? row.vacant / row.sanctioned : 0;
              return (
                <div key={row.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{row.designation}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {row.subject ? `${row.subject} · ` : ''}{row.department}
                      </p>
                      {(isSuperAdmin || isStateUser) && (
                        <p className="text-[11px] font-medium text-primary-600 dark:text-primary-400 mt-0.5">{row.university}</p>
                      )}
                    </div>
                    <Badge value={row.postType} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center rounded-lg bg-gray-50 dark:bg-gray-800/50 py-2">
                      <p className="text-base font-bold tabular-nums text-blue-700 dark:text-blue-400">{row.sanctioned}</p>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Sanctioned</p>
                    </div>
                    <div className="text-center rounded-lg bg-gray-50 dark:bg-gray-800/50 py-2">
                      <p className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{row.filled}</p>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Filled</p>
                    </div>
                    <div className={`text-center rounded-lg py-2 ${row.vacant > 0 ? (vacantPct >= 0.5 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-orange-50 dark:bg-orange-500/10') : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                      <p className={`text-base font-bold tabular-nums ${row.vacant > 0 ? (vacantPct >= 0.5 ? 'text-red-700 dark:text-red-400' : 'text-orange-600 dark:text-orange-400') : 'text-gray-400'}`}>{row.vacant}</p>
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">Vacant</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${rowFill >= 75 ? 'bg-emerald-500' : rowFill >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(rowFill, 100)}%` }} />
                    </div>
                    <span className={`text-xs font-semibold tabular-nums ${rowFill >= 75 ? 'text-emerald-600 dark:text-emerald-400' : rowFill >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{rowFill}%</span>
                    {(row.excess || 0) > 0 && <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">+{row.excess} excess</span>}
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}

        {/* Footer */}
        {activeCount > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Showing {activeCount} of {totalCount} records</span>
            <span>Use column headers to filter</span>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowImport(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Import Sanctioned Posts</h3>
              <button onClick={() => setShowImport(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">University *</label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" value={importUniversityId} onChange={e => setImportUniversityId(e.target.value)}>
                    <option value="">Select University</option>
                    {universities.map(u => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                  </select>
                </div>
              )}
              {!isSuperAdmin && user?.university && (
                <div className="bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 rounded-lg px-4 py-2.5">
                  <p className="text-sm text-primary-800 dark:text-primary-300">Importing for: <span className="font-semibold">{user.university.name} ({user.university.code})</span></p>
                </div>
              )}
              <div
                onClick={() => importFileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-500/5 transition-colors"
              >
                <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="hidden" />
                {importFile ? (
                  <div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{importFile.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{(importFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Click or drag file to upload</p>
                    <p className="text-sm text-gray-400 mt-1">Supported: .xlsx, .xls, .csv</p>
                  </div>
                )}
              </div>
              {importError && <div className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">{importError}</div>}
              {importResult && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Import Results</p>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center p-2 bg-white dark:bg-gray-900 rounded-lg"><p className="text-xl font-bold text-gray-700 dark:text-gray-300">{importResult.total}</p><p className="text-[10px] text-gray-500">Total</p></div>
                    <div className="text-center p-2 bg-green-50 dark:bg-green-500/10 rounded-lg"><p className="text-xl font-bold text-green-700 dark:text-green-400">{importResult.success}</p><p className="text-[10px] text-green-600">Imported</p></div>
                    <div className="text-center p-2 bg-red-50 dark:bg-red-500/10 rounded-lg"><p className="text-xl font-bold text-red-700 dark:text-red-400">{importResult.failed}</p><p className="text-[10px] text-red-600">Failed</p></div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="max-h-32 overflow-y-auto bg-red-50 dark:bg-red-500/10 rounded-lg p-3 space-y-1">
                      {importResult.errors.map((err, i) => <p key={i} className="text-xs text-red-600">{err}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800">
              <button onClick={downloadTemplate} className="px-4 py-2.5 border border-primary-300 dark:border-primary-500/40 text-primary-700 dark:text-primary-300 rounded-lg text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors">Download sample template</button>
              <div className="flex gap-3">
                <button onClick={() => setShowImport(false)} className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                <button onClick={handleImport} disabled={importing || !importFile} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
