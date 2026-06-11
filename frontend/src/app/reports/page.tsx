'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/export-utils';

type ReportKey = string;

interface ReportDef {
  key: ReportKey;
  label: string;
  description: string;
  icon: string;
  color: string;
  stateOnly?: boolean;
}

const stateReports: ReportDef[] = [
  { key: 'university-wise', label: 'University-wise Employee Report', description: 'Employee count by university with type and gender breakdown', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5', color: 'from-primary-500 to-primary-600', stateOnly: true },
  { key: 'employee-strength', label: 'Employee Strength Report', description: 'Sanctioned posts, filled posts, and vacancies per university', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'from-emerald-500 to-emerald-600', stateOnly: true },
];

const commonReports: ReportDef[] = [
  { key: 'department-wise', label: 'Department-wise Report', description: 'Employee distribution across departments', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', color: 'from-violet-500 to-violet-600' },
  { key: 'subject-wise', label: 'Subject-wise Report', description: 'Employee count grouped by subject', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', color: 'from-amber-500 to-amber-600' },
  { key: 'designation-wise', label: 'Designation-wise Report', description: 'Employee distribution by designation', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138c.18.71.528 1.362 1.066 1.946a3.42 3.42 0 010 4.438', color: 'from-rose-500 to-rose-600' },
  { key: 'category-wise', label: 'Category-wise Report', description: 'Employee count by reservation category', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', color: 'from-cyan-500 to-cyan-600' },
  { key: 'gender-wise', label: 'Gender-wise Report', description: 'Gender distribution with classification breakdown', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: 'from-pink-500 to-pink-600' },
  { key: 'teaching-staff', label: 'Teaching Staff Report', description: 'All active teaching employees', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z', color: 'from-indigo-500 to-indigo-600' },
  { key: 'retirement-due', label: 'Retirement Due Report', description: 'Employees retiring within next 12 months', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-orange-500 to-orange-600' },
  { key: 'employee-directory', label: 'Employee Directory', description: 'Contact directory of active employees', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', color: 'from-teal-500 to-teal-600' },
];

const FILTER_DEFS: { key: string; label: string; matchColumns: string[] }[] = [
  { key: 'university', label: 'University', matchColumns: ['university', 'code', 'university.code'] },
  { key: 'department', label: 'Department', matchColumns: ['department', 'department.name'] },
  { key: 'designation', label: 'Designation', matchColumns: ['designation', 'designationPresent'] },
  { key: 'gender', label: 'Gender', matchColumns: ['gender'] },
  { key: 'category', label: 'Category', matchColumns: ['category'] },
  { key: 'postType', label: 'Post Type', matchColumns: ['postType'] },
  { key: 'subject', label: 'Subject', matchColumns: ['subject'] },
  { key: 'classification', label: 'Classification', matchColumns: ['classification', 'employeeClassification'] },
];

function formatHeader(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/\./g, ' ')
    .replace(/_/g, ' ');
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [exportOpen, setExportOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isSuperOrState = user?.role === 'SUPER_ADMIN' || user?.role === 'STATE_USER';
  const allReports = [...(isSuperOrState ? stateReports : []), ...commonReports];

  async function loadReport(key: ReportKey) {
    setLoading(true);
    setActiveReport(key);
    setSearch('');
    setSortCol(null);
    setFilters({});
    try {
      const data = await api.get<any[]>(`/reports/${key}`);
      setReportData(Array.isArray(data) ? data : []);
    } catch {
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }

  function doExport(fmt: 'csv' | 'excel' | 'pdf') {
    if (!sorted.length) return;
    const cols = columns.map((k) => ({ key: k, label: formatHeader(k) }));
    const title = allReports.find((r) => r.key === activeReport)?.label || 'Report';
    const name = `${activeReport}-report`;
    if (fmt === 'csv') exportToCSV(name, cols, sorted);
    else if (fmt === 'excel') exportToExcel(name, cols, sorted);
    else exportToPDF(title, cols, sorted);
    setExportOpen(false);
  }

  function flattenRow(row: any): Record<string, any> {
    const flat: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
        for (const [sk, sv] of Object.entries(v as Record<string, any>)) {
          flat[`${k}.${sk}`] = sv;
        }
      } else {
        flat[k] = v;
      }
    }
    return flat;
  }

  const flatData = reportData.map(flattenRow);
  const columns = flatData.length > 0 ? Object.keys(flatData[0]).filter((k) => !k.endsWith('Id') && k !== 'id' && k !== 'documents') : [];

  const availableFilters = useMemo(() => {
    if (!columns.length) return [];
    return FILTER_DEFS.filter(fd =>
      fd.matchColumns.some(mc => columns.includes(mc))
    ).map(fd => {
      const col = fd.matchColumns.find(mc => columns.includes(mc))!;
      const values = [...new Set(flatData.map(r => String(r[col] ?? '')).filter(Boolean))].sort();
      return { ...fd, col, values };
    }).filter(f => f.values.length > 1);
  }, [flatData, columns]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Filter by dropdowns
  const dropdownFiltered = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, v]) => v);
    if (!activeFilters.length) return flatData;
    return flatData.filter(row =>
      activeFilters.every(([filterKey, filterVal]) => {
        const fd = availableFilters.find(f => f.key === filterKey);
        if (!fd) return true;
        return String(row[fd.col] ?? '') === filterVal;
      })
    );
  }, [flatData, filters, availableFilters]);

  // Search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return dropdownFiltered;
    const q = search.toLowerCase();
    return dropdownFiltered.filter(row => columns.some(k => String(row[k] ?? '').toLowerCase().includes(q)));
  }, [dropdownFiltered, search, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      const an = Number(av);
      const bn = Number(bv);
      if (!isNaN(an) && !isNaN(bn)) return sortDir === 'asc' ? an - bn : bn - an;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortCol, sortDir]);

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const numericCols = useMemo(() => {
    if (!flatData.length) return new Set<string>();
    return new Set(columns.filter(k => flatData.every(r => r[k] === null || r[k] === undefined || r[k] === '' || !isNaN(Number(r[k])))));
  }, [flatData, columns]);

  function clearAllFilters() {
    setFilters({});
    setSearch('');
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white whitespace-nowrap">Reports</h1>
        <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-500/15 px-2.5 py-1 rounded-full whitespace-nowrap">
          {allReports.length}
        </span>
      </div>

      <div
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{
          maxHeight: activeReport ? 0 : 1000,
          opacity: activeReport ? 0 : 1,
          marginBottom: activeReport ? 0 : 32,
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allReports.map((report) => (
            <button
              key={report.key}
              onClick={() => loadReport(report.key)}
              className="group text-left p-5 rounded-2xl border-2 border-gray-100 bg-white dark:bg-gray-900 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${report.color} flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-105`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={report.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm leading-tight text-gray-900 dark:text-gray-100">{report.label}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{report.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeReport && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {/* Header bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/60 dark:to-gray-900">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setActiveReport(null); setReportData([]); setSearch(''); setFilters({}); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Back to reports"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {(() => {
                const r = allReports.find((r) => r.key === activeReport);
                return r ? (
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center shadow-sm`}>
                    <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={r.icon} />
                    </svg>
                  </div>
                ) : null;
              })()}
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{allReports.find((r) => r.key === activeReport)?.label}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {sorted.length} records
                  {(search || activeFilterCount > 0) ? ` (filtered from ${flatData.length})` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {availableFilters.length > 0 && (
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
              )}
              {/* Search */}
              <div className="relative flex-1 sm:flex-none">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search in results..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-56 pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {/* Export */}
              <div className="relative shrink-0" ref={exportRef}>
                <button onClick={() => setExportOpen(!exportOpen)} disabled={!reportData.length} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 w-40">
                    <button onClick={() => doExport('csv')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">CSV (.csv)</button>
                    <button onClick={() => doExport('excel')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Excel (.xlsx)</button>
                    <button onClick={() => doExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">PDF (print)</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filter sidebar */}
          {showFilters && <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={() => setShowFilters(false)} />}
          <div
            className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${showFilters ? 'translate-x-0' : '-translate-x-full'}`}
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
                      onChange={(e) => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
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
                        onClick={() => setFilters(prev => ({ ...prev, [f.key]: '' }))}
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

          {/* Table */}
          {loading ? (
            <div className="p-20 text-center">
              <div className="w-10 h-10 border-3 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading report...</p>
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={search || activeFilterCount > 0 ? '🔍' : '📄'}
              title={search || activeFilterCount > 0 ? 'No matching records' : 'No data available'}
              description={search || activeFilterCount > 0 ? 'Try adjusting your filters or search term.' : 'This report returned no rows.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-700 text-white">
                    <th className="text-center align-middle px-4 py-3.5 font-semibold text-xs uppercase tracking-wider w-10">#</th>
                    {columns.map((key) => (
                      <th
                        key={key}
                        onClick={() => toggleSort(key)}
                        className={`group px-4 py-3.5 align-middle font-semibold text-xs uppercase tracking-wider cursor-pointer hover:bg-primary-600 transition-colors select-none ${numericCols.has(key) ? 'text-center' : 'text-left'}`}
                      >
                        <div className={`flex items-center gap-1.5 ${numericCols.has(key) ? 'justify-center' : ''}`}>
                          <span>{formatHeader(key)}</span>
                          {sortCol === key ? (
                            <svg className="w-3.5 h-3.5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-50 dark:border-gray-800 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'} hover:bg-primary-50/40 dark:hover:bg-gray-800/60`}>
                      <td className="px-4 py-3 text-center align-middle text-gray-400 text-xs font-mono">{i + 1}</td>
                      {columns.map((k) => {
                        let val = row[k];
                        if (val && typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                          val = new Date(val).toLocaleDateString('en-IN');
                        }
                        const isNum = numericCols.has(k);
                        const display = String(val ?? '-');
                        return (
                          <td key={k} className={`px-4 py-3 whitespace-nowrap align-middle ${isNum ? 'text-center font-semibold text-gray-900 dark:text-gray-100 tabular-nums' : 'text-gray-700 dark:text-gray-300'}`}>
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {sorted.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Showing {sorted.length} of {flatData.length} records</span>
              <span>Click column headers to sort</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
