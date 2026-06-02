'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Employee, University, PaginatedResponse } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/export-utils';

interface ColDef {
  key: string;
  label: string;
  alwaysOn?: boolean;
  numeric?: boolean;
  render: (emp: Employee, idx: number, page: number) => React.ReactNode;
}

const ALL_COLUMNS: ColDef[] = [
  { key: 'srno', label: 'Sr.No.', alwaysOn: true, numeric: true, render: (_e, i, p) => i + 1 + (p - 1) * 20 },
  { key: 'uniName', label: 'University Name', render: (e) => e.university?.name || '-' },
  { key: 'uniCode', label: 'University Code', render: (e) => e.university?.code || '-' },
  { key: 'name', label: 'Employee Name', alwaysOn: true, render: (e) => <span className="font-medium">{e.name}</span> },
  { key: 'subject', label: 'Subject', render: (e) => e.subject || '-' },
  { key: 'category', label: 'Category', render: (e) => <Badge value={e.category} /> },
  { key: 'catSelection', label: 'Selection Category', render: (e) => <Badge value={e.categorySelection} /> },
  { key: 'designation', label: 'Designation', render: (e) => e.designationAppointed || '-' },
  { key: 'presentDesig', label: 'Present Designation', render: (e) => e.designationPresent || '-' },
  { key: 'gender', label: 'Gender', render: (e) => <Badge value={e.gender} /> },
  { key: 'postType', label: 'Type', render: (e) => <Badge value={e.postType} /> },
];

const DEFAULT_VISIBLE = ALL_COLUMNS.map((c) => c.key);

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResponse<Employee>>({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [universities, setUniversities] = useState<University[]>([]);
  const [visibleCols, setVisibleCols] = useState<string[]>(DEFAULT_VISIBLE);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('emp-visible-cols');
    if (saved) {
      try {
        const parsed: string[] = JSON.parse(saved);
        const allKeys = ALL_COLUMNS.map((c) => c.key);
        const merged = [...new Set([...parsed, ...allKeys.filter((k) => !parsed.includes(k))])];
        setVisibleCols(merged);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenuOpen(false);
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleCol = (key: string) => {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (col?.alwaysOn) return;
    const next = visibleCols.includes(key) ? visibleCols.filter((k) => k !== key) : [...visibleCols, key];
    setVisibleCols(next);
    localStorage.setItem('emp-visible-cols', JSON.stringify(next));
  };

  const activeCols = ALL_COLUMNS.filter((c) => visibleCols.includes(c.key));

  const canWrite = user?.role === 'UNIVERSITY_ADMIN';

  useEffect(() => {
    if (user?.role !== 'UNIVERSITY_ADMIN') {
      api.get<University[]>('/universities').then(setUniversities);
    }
  }, [user]);

  const fetchEmployees = useCallback((page: number = 1, extra: Record<string, string> = {}) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', ...extra });
    api.get<PaginatedResponse<Employee>>(`/employees?${params}`).then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleSearch = () => {
    const f = { ...filters, ...(search ? { search } : {}) };
    setFilters(f);
    fetchEmployees(1, f);
  };

  const applyFilter = (key: string, value: string) => {
    const next = { ...filters };
    if (value) next[key] = value; else delete next[key];
    if (search) next.search = search;
    setFilters(next);
    fetchEmployees(1, next);
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearch('');
    fetchEmployees(1, {});
  };

  const activeFilterCount = Object.keys(filters).filter(k => k !== 'search' && filters[k]).length;

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete employee "${name}"?`)) return;
    try {
      await api.delete(`/employees/${id}`);
      toast(`Deleted "${name}"`, 'success');
      fetchEmployees(data.page, filters);
    } catch { toast('Failed to delete employee', 'error'); }
  };

  const buildExportRows = () =>
    data.data.map((e, i) => ({
      'Sr.No.': i + 1 + (data.page - 1) * 20,
      'University Name': e.university?.name || '',
      'University Code': e.university?.code || '',
      'Employee Name': e.name,
      'Subject': e.subject || '',
      'Category': e.category,
      'Selection Category': e.categorySelection,
      'Designation': e.designationAppointed || '',
      'Present Designation': e.designationPresent || '',
      'Gender': e.gender,
      'Post Type': e.postType,
      'Status': e.employmentStatus,
    }));

  const handleExport = (fmt: 'csv' | 'excel' | 'pdf') => {
    const rows = buildExportRows();
    if (!rows.length) { toast('Nothing to export', 'error'); return; }
    const cols = Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
    if (fmt === 'csv') exportToCSV('employees', cols, rows);
    else if (fmt === 'excel') exportToExcel('employees', cols, rows);
    else exportToPDF('Employees', cols, rows);
    setExportMenuOpen(false);
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Employees', icon: 'employees' }]} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          Employees
          {data.total > 0 && <span className="text-sm font-normal text-gray-400 ml-1">({data.total.toLocaleString()})</span>}
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg text-sm w-64 focus:outline-none focus:border-blue-500"
            />
          </div>
          {canWrite && (
            <Link href="/employees/new" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Add Employee
            </Link>
          )}
          {canWrite && (
            <Link href="/employees/upload" className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload Excel
            </Link>
          )}
          <div className="relative" ref={exportMenuRef}>
            <button onClick={() => setExportMenuOpen(!exportMenuOpen)} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 w-40">
                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">CSV (.csv)</button>
                <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Excel (.xlsx)</button>
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">PDF (print)</button>
              </div>
            )}
          </div>
          {/* Column visibility toggle */}
          <div className="relative" ref={colMenuRef}>
            <button
              onClick={() => setColMenuOpen(!colMenuOpen)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="Show/Hide Columns"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              Columns
            </button>
            {colMenuOpen && (
              <div className="absolute right-0 top-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-2 w-56">
                <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase">Toggle Columns</p>
                {ALL_COLUMNS.map((col) => (
                  <label key={col.key} className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${col.alwaysOn ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={visibleCols.includes(col.key)}
                      disabled={col.alwaysOn}
                      onChange={() => toggleCol(col.key)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {col.label}
                  </label>
                ))}
                <hr className="my-1" />
                <button
                  onClick={() => { setVisibleCols(DEFAULT_VISIBLE); localStorage.setItem('emp-visible-cols', JSON.stringify(DEFAULT_VISIBLE)); }}
                  className="w-full text-left px-4 py-2 text-xs text-blue-600 hover:bg-gray-50 font-medium"
                >
                  Reset to default
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300' : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          Filters
          {activeFilterCount > 0 && <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearAllFilters} className="text-sm text-red-500 hover:text-red-700 font-medium">Clear all</button>
        )}
        {/* Active filter tags */}
        {Object.entries(filters).filter(([k, v]) => k !== 'search' && v).map(([k, v]) => {
          const labelMap: Record<string, string> = { universityId: 'University', gender: 'Gender', category: 'Category', postType: 'Post Type', employmentStatus: 'Status', designation: 'Designation' };
          let displayVal = v;
          if (k === 'universityId') { const u = universities.find((u) => u.id === v); displayVal = u ? u.code : v; }
          if (k === 'postType') displayVal = v === 'SFS' ? 'Self Financed' : v === 'BUDGETED' ? 'Budgeted' : v === 'CONTRACTUAL' ? 'Contractual' : v;
          if (k === 'gender') displayVal = v === 'MALE' ? 'Male' : v === 'FEMALE' ? 'Female' : 'Other';
          return (
          <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
            {labelMap[k] || k}: {displayVal}
            <button onClick={() => applyFilter(k, '')} className="hover:text-red-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
          );
        })}
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* University */}
            {user?.role !== 'UNIVERSITY_ADMIN' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">University</label>
                <select value={filters.universityId || ''} onChange={(e) => applyFilter('universityId', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-blue-500">
                  <option value="">All</option>
                  {universities.map((u) => <option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
                </select>
              </div>
            )}
            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Gender</label>
              <select value={filters.gender || ''} onChange={(e) => applyFilter('gender', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">All</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Category</label>
              <select value={filters.category || ''} onChange={(e) => applyFilter('category', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">All</option>
                {['GENERAL','SC','ST','OBC','EWS','BCA','BCB','PWD','ESM'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Post Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Post Type</label>
              <select value={filters.postType || ''} onChange={(e) => applyFilter('postType', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">All</option>
                <option value="BUDGETED">Budgeted</option>
                <option value="SFS">Self Financed</option>
                <option value="CONTRACTUAL">Contractual</option>
              </select>
            </div>
            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <select value={filters.employmentStatus || ''} onChange={(e) => applyFilter('employmentStatus', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="RETIRED">Retired</option>
                <option value="RESIGNED">Resigned</option>
                <option value="TERMINATED">Terminated</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            {/* Designation */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Designation</label>
              <select value={filters.designation || ''} onChange={(e) => applyFilter('designation', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">All</option>
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Senior Professor">Senior Professor</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading && <TableSkeleton rows={10} cols={activeCols.length} />}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                {activeCols.map((col) => (
                  <th key={col.key} className={`px-3 py-3 align-middle font-semibold whitespace-nowrap text-xs uppercase tracking-wide ${col.numeric ? 'text-center' : 'text-left'}`}>{col.label}</th>
                ))}
                <th className="px-3 py-3 text-center font-semibold text-xs uppercase tracking-wide sticky right-0 bg-blue-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.data.length === 0 ? (
                <tr>
                  <td colSpan={activeCols.length + 1} className="p-0">
                    <EmptyState
                      icon="🧑‍🏫"
                      title="No employees found"
                      description={activeFilterCount > 0 || search ? 'No employees match your current filters.' : 'There are no employee records to show yet.'}
                      action={canWrite ? { label: 'Add Employee', onClick: () => router.push('/employees/new') } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                data.data.map((emp, i) => (
                  <tr key={emp.id} className={`border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50/50 dark:hover:bg-gray-800/50 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/30'}`}>
                    {activeCols.map((col) => (
                      <td key={col.key} className={`px-3 py-2.5 align-middle text-gray-700 dark:text-gray-300 whitespace-nowrap ${col.numeric ? 'text-center tabular-nums' : ''}`}>{col.render(emp, i, data.page)}</td>
                    ))}
                    <td className="px-3 py-2.5 sticky right-0 bg-inherit">
                      <div className="flex items-center justify-center gap-2">
                        {/* View */}
                        <button
                          onClick={() => router.push(`/employees/${emp.id}`)}
                          className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="View"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        {/* Edit */}
                        {canWrite && (
                          <button
                            onClick={() => router.push(`/employees/${emp.id}`)}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                          </button>
                        )}
                        {/* Delete */}
                        {canWrite && (
                          <button
                            onClick={() => handleDelete(emp.id, emp.name)}
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {data.data.length} of {data.total} records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchEmployees(data.page - 1, filters)}
              disabled={data.page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-40 hover:bg-white dark:hover:bg-gray-800 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Page {data.page} of {data.totalPages}</span>
            <button
              onClick={() => fetchEmployees(data.page + 1, filters)}
              disabled={data.page >= data.totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-40 hover:bg-white dark:hover:bg-gray-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
