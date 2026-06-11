'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Employee, University, Department, PaginatedResponse } from '@/lib/types';
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
  className?: string;
  render: (emp: Employee, idx: number, page: number) => React.ReactNode;
}

const ALL_COLUMNS: ColDef[] = [
  { key: 'srno', label: 'Sr.No.', alwaysOn: true, numeric: true, className: 'w-14', render: (_e, i, p) => i + 1 + (p - 1) * 20 },
  { key: 'name', label: 'Employee Name', alwaysOn: true, render: (e) => <span className="font-medium">{e.name}</span> },
  { key: 'uniName', label: 'University Name', render: (e) => e.university?.name || '-' },
  { key: 'uniCode', label: 'University Code', className: 'w-24', render: (e) => e.university?.code || '-' },
  { key: 'subject', label: 'Subject', render: (e) => e.subject || '-' },
  { key: 'designation', label: 'Designation', render: (e) => e.designationAppointed || '-' },
  { key: 'category', label: 'Category', className: 'w-24', render: (e) => <Badge value={e.category} /> },
  { key: 'catSelection', label: 'Selection Category', render: (e) => <Badge value={e.categorySelection} /> },
  { key: 'presentDesig', label: 'Present Designation', render: (e) => e.designationPresent || '-' },
  { key: 'gender', label: 'Gender', className: 'w-20', render: (e) => <Badge value={e.gender} /> },
  { key: 'postType', label: 'Type', className: 'w-20', render: (e) => <Badge value={e.postType} /> },
];

const DEFAULT_VISIBLE = ALL_COLUMNS.map((c) => c.key);
const UNI_ADMIN_HIDDEN = ['uniName', 'uniCode'];

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

  // Add Employee modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDepartments, setAddDepartments] = useState<Department[]>([]);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const emptyForm = {
    employeeId: '', name: '', gender: 'MALE',
    universityId: '', departmentId: '', subject: '',
    category: 'GENERAL', categorySelection: 'GENERAL',
    postType: 'BUDGETED', employeeClassification: 'TEACHING',
    designationAppointed: '', designationPresent: '',
    dateOfJoining: '', retirementDate: '',
    employmentStatus: 'ACTIVE',
    mobileNumber: '', email: '',
  };
  const [addForm, setAddForm] = useState(emptyForm);

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; total: number; errors: string[] } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadUniversityId, setUploadUniversityId] = useState('');
  const uploadFileRef = useRef<HTMLInputElement>(null);

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

  const hiddenKeys = user?.role === 'UNIVERSITY_ADMIN' ? UNI_ADMIN_HIDDEN : [];
  const activeCols = ALL_COLUMNS.filter((c) => visibleCols.includes(c.key) && !hiddenKeys.includes(c.key));

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

  useEffect(() => {
    const timer = setTimeout(() => {
      const f = { ...filters, ...(search ? { search } : {}) };
      if (!search) delete f.search;
      setFilters(f);
      fetchEmployees(1, f);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

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

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isStateUser = user?.role === 'STATE_USER';
  const fixedUniversityId = !isSuperAdmin && !isStateUser ? user?.university?.id || '' : '';

  // Add Employee handlers
  useEffect(() => {
    const uid = addForm.universityId || fixedUniversityId;
    if (uid) api.get<Department[]>(`/departments?universityId=${uid}`).then(setAddDepartments);
  }, [addForm.universityId, fixedUniversityId]);

  useEffect(() => {
    if (fixedUniversityId) setAddForm(prev => ({ ...prev, universityId: fixedUniversityId }));
  }, [fixedUniversityId]);

  function openAddModal() {
    setAddForm({ ...emptyForm, universityId: fixedUniversityId });
    setAddError('');
    setShowAddModal(true);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddSaving(true); setAddError('');
    try {
      await api.post('/employees', addForm);
      toast('Employee added', 'success');
      setShowAddModal(false);
      fetchEmployees(data.page, filters);
    } catch (err: any) { setAddError(err.message); }
    finally { setAddSaving(false); }
  }

  // Upload handlers
  function openUploadModal() {
    setUploadFile(null); setUploadError(''); setUploadResult(null); setUploadUniversityId('');
    if (uploadFileRef.current) uploadFileRef.current.value = '';
    setShowUploadModal(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) { setUploadError('Only .xlsx, .xls, .csv supported'); return; }
    setUploadFile(f); setUploadError(''); setUploadResult(null);
  }

  async function handleUpload() {
    if (!uploadFile) { setUploadError('Please select a file'); return; }
    const uid = (isSuperAdmin || isStateUser) ? uploadUniversityId : user?.university?.id;
    if (!uid) { setUploadError('Please select a university'); return; }
    setUploading(true); setUploadError('');
    try {
      const res = await api.uploadFile<{ success: number; failed: number; total: number; errors: string[] }>('/employees/bulk-upload', uploadFile, { universityId: uid });
      setUploadResult(res);
      fetchEmployees(data.page, filters);
    } catch (err: any) { setUploadError(err.message || 'Upload failed'); }
    finally { setUploading(false); }
  }

  function downloadTemplate() {
    const token = localStorage.getItem('token');
    const base = process.env.NEXT_PUBLIC_API_URL || '/api';
    fetch(`${base}/employees/template`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob()).then(blob => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'employee-upload-template.xlsx'; a.click(); URL.revokeObjectURL(a.href);
      });
  }

  const addInp = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400';
  const addLbl = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white whitespace-nowrap">Employees</h1>
        {data.total > 0 && <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-500/15 px-2.5 py-1 rounded-full whitespace-nowrap">{data.total.toLocaleString()}</span>}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-primary-100 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          title="Toggle filters"
        >
          <svg className={`w-5 h-5 ${showFilters || activeFilterCount > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          {activeFilterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center font-bold">{activeFilterCount}</span>
          )}
        </button>
        <div className="relative flex-1 max-w-sm ml-auto">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, subject, designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg text-sm focus:outline-none focus:border-primary-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
          {canWrite && (
            <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Add Employee
            </button>
          )}
          {canWrite && (
            <button onClick={openUploadModal} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload Excel
            </button>
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
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    {col.label}
                  </label>
                ))}
                <hr className="my-1" />
                <button
                  onClick={() => { setVisibleCols(DEFAULT_VISIBLE); localStorage.setItem('emp-visible-cols', JSON.stringify(DEFAULT_VISIBLE)); }}
                  className="w-full text-left px-4 py-2 text-xs text-primary-600 hover:bg-gray-50 font-medium"
                >
                  Reset to default
                </button>
              </div>
            )}
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
            {user?.role !== 'UNIVERSITY_ADMIN' && (
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">University</label>
                <select
                  value={filters.universityId || ''}
                  onChange={(e) => applyFilter('universityId', e.target.value)}
                  className={`w-full px-3 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all appearance-none pr-8 ${
                    filters.universityId
                      ? 'border-gray-900 dark:border-gray-200 text-gray-900 dark:text-gray-100 font-medium'
                      : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <option value="">University</option>
                  {universities.map((u) => <option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
                </select>
                {filters.universityId ? (
                  <button onClick={() => applyFilter('universityId', '')} className="absolute right-2.5 bottom-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                ) : (
                  <svg className="absolute right-2.5 bottom-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                )}
              </div>
            )}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Gender</label>
              <select
                value={filters.gender || ''}
                onChange={(e) => applyFilter('gender', e.target.value)}
                className={`w-full px-3 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all appearance-none pr-8 ${
                  filters.gender
                    ? 'border-gray-900 dark:border-gray-200 text-gray-900 dark:text-gray-100 font-medium'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }`}
              >
                <option value="">Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              {filters.gender ? (
                <button onClick={() => applyFilter('gender', '')} className="absolute right-2.5 bottom-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              ) : (
                <svg className="absolute right-2.5 bottom-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) => applyFilter('category', e.target.value)}
                className={`w-full px-3 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all appearance-none pr-8 ${
                  filters.category
                    ? 'border-gray-900 dark:border-gray-200 text-gray-900 dark:text-gray-100 font-medium'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }`}
              >
                <option value="">Category</option>
                {['GENERAL','SC','ST','EWS','BCA','BCB','PWD','ESM'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {filters.category ? (
                <button onClick={() => applyFilter('category', '')} className="absolute right-2.5 bottom-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              ) : (
                <svg className="absolute right-2.5 bottom-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Post Type</label>
              <select
                value={filters.postType || ''}
                onChange={(e) => applyFilter('postType', e.target.value)}
                className={`w-full px-3 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all appearance-none pr-8 ${
                  filters.postType
                    ? 'border-gray-900 dark:border-gray-200 text-gray-900 dark:text-gray-100 font-medium'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }`}
              >
                <option value="">Post Type</option>
                <option value="BUDGETED">Budgeted</option>
                <option value="SFS">Self Financed</option>
                <option value="CONTRACTUAL">Contractual</option>
              </select>
              {filters.postType ? (
                <button onClick={() => applyFilter('postType', '')} className="absolute right-2.5 bottom-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              ) : (
                <svg className="absolute right-2.5 bottom-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
              <select
                value={filters.employmentStatus || ''}
                onChange={(e) => applyFilter('employmentStatus', e.target.value)}
                className={`w-full px-3 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all appearance-none pr-8 ${
                  filters.employmentStatus
                    ? 'border-gray-900 dark:border-gray-200 text-gray-900 dark:text-gray-100 font-medium'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }`}
              >
                <option value="">Status</option>
                <option value="ACTIVE">Active</option>
                <option value="RETIRED">Retired</option>
                <option value="RESIGNED">Resigned</option>
                <option value="TERMINATED">Terminated</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
              {filters.employmentStatus ? (
                <button onClick={() => applyFilter('employmentStatus', '')} className="absolute right-2.5 bottom-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              ) : (
                <svg className="absolute right-2.5 bottom-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Designation</label>
              <select
                value={filters.designation || ''}
                onChange={(e) => applyFilter('designation', e.target.value)}
                className={`w-full px-3 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all appearance-none pr-8 ${
                  filters.designation
                    ? 'border-gray-900 dark:border-gray-200 text-gray-900 dark:text-gray-100 font-medium'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }`}
              >
                <option value="">Designation</option>
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Senior Professor">Senior Professor</option>
              </select>
              {filters.designation ? (
                <button onClick={() => applyFilter('designation', '')} className="absolute right-2.5 bottom-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              ) : (
                <svg className="absolute right-2.5 bottom-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              )}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <button onClick={clearAllFilters} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">RESET</button>
            <button onClick={() => setShowFilters(false)} className="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">APPLY</button>
          </div>
        </div>
      </div>

      {loading && <TableSkeleton rows={10} cols={activeCols.length} />}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-primary-700 text-white">
                {activeCols.map((col) => (
                  <th key={col.key} className={`sticky top-0 z-10 bg-primary-700 px-3 py-3 align-middle font-semibold whitespace-nowrap text-xs uppercase tracking-wide ${col.numeric ? 'text-center' : 'text-left'} ${col.className || ''}`}>{col.label}</th>
                ))}
                <th className="sticky top-0 z-10 px-3 py-3 text-center font-semibold text-xs uppercase tracking-wide sticky right-0 bg-primary-700">Action</th>
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
                  <tr key={emp.id} className={`border-b border-gray-100 dark:border-gray-800 hover:bg-primary-50/50 dark:hover:bg-gray-800/50 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/40 dark:bg-gray-800/30'}`}>
                    {activeCols.map((col) => (
                      <td key={col.key} className={`px-3 py-2.5 align-middle text-gray-700 dark:text-gray-300 whitespace-nowrap ${col.numeric ? 'text-center tabular-nums' : ''} ${col.className || ''}`}>{col.render(emp, i, data.page)}</td>
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
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors"
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
      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {addError && <div className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm mb-4">{addError}</div>}
              {!isSuperAdmin && !isStateUser && user?.university && (
                <div className="bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 rounded-lg px-4 py-2.5 mb-4">
                  <p className="text-sm text-primary-800 dark:text-primary-300">University: <span className="font-semibold">{user.university.name} ({user.university.code})</span></p>
                </div>
              )}
              <form id="add-employee-form" onSubmit={handleAddSubmit}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Personal Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div><label className={addLbl}>Employee ID</label><input className={addInp} value={addForm.employeeId} onChange={e => setAddForm(p => ({ ...p, employeeId: e.target.value }))} /></div>
                  <div><label className={addLbl}>Employee Name *</label><input className={addInp} value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} required /></div>
                  <div><label className={addLbl}>Gender *</label>
                    <select className={addInp} value={addForm.gender} onChange={e => setAddForm(p => ({ ...p, gender: e.target.value }))}>
                      <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div><label className={addLbl}>Mobile Number</label><input className={addInp} value={addForm.mobileNumber} onChange={e => setAddForm(p => ({ ...p, mobileNumber: e.target.value }))} /></div>
                  <div><label className={addLbl}>Email Address</label><input type="email" className={addInp} value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} /></div>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Employment Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(isSuperAdmin || isStateUser) && (
                    <div><label className={addLbl}>University *</label>
                      <select className={addInp} value={addForm.universityId} onChange={e => setAddForm(p => ({ ...p, universityId: e.target.value }))} required>
                        <option value="">Select University</option>
                        {universities.map(u => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                      </select>
                    </div>
                  )}
                  <div><label className={addLbl}>Department *</label>
                    <select className={addInp} value={addForm.departmentId} onChange={e => setAddForm(p => ({ ...p, departmentId: e.target.value }))} required>
                      <option value="">Select Department</option>
                      {addDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div><label className={addLbl}>Subject</label><input className={addInp} value={addForm.subject} onChange={e => setAddForm(p => ({ ...p, subject: e.target.value }))} /></div>
                  <div><label className={addLbl}>Designation (Appointment)</label><input className={addInp} value={addForm.designationAppointed} onChange={e => setAddForm(p => ({ ...p, designationAppointed: e.target.value }))} /></div>
                  <div><label className={addLbl}>Designation (Present)</label><input className={addInp} value={addForm.designationPresent} onChange={e => setAddForm(p => ({ ...p, designationPresent: e.target.value }))} /></div>
                  <div><label className={addLbl}>Post Type</label>
                    <select className={addInp} value={addForm.postType} onChange={e => setAddForm(p => ({ ...p, postType: e.target.value }))}>
                      <option value="BUDGETED">Budgeted</option><option value="SFS">SFS</option><option value="CONTRACTUAL">Contractual</option>
                    </select>
                  </div>
                  <div><label className={addLbl}>Category</label>
                    <select className={addInp} value={addForm.category} onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))}>
                      {['GENERAL','SC','ST','EWS','BCA','BCB','PWD','ESM'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className={addLbl}>Category (Selection)</label>
                    <select className={addInp} value={addForm.categorySelection} onChange={e => setAddForm(p => ({ ...p, categorySelection: e.target.value }))}>
                      {['GENERAL','SC','ST','EWS','BCA','BCB','PWD','ESM'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className={addLbl}>Employment Status</label>
                    <select className={addInp} value={addForm.employmentStatus} onChange={e => setAddForm(p => ({ ...p, employmentStatus: e.target.value }))}>
                      <option value="ACTIVE">Active</option><option value="RETIRED">Retired</option><option value="RESIGNED">Resigned</option><option value="TERMINATED">Terminated</option>
                    </select>
                  </div>
                  <div><label className={addLbl}>Date of Joining</label><input type="date" className={addInp} value={addForm.dateOfJoining} onChange={e => setAddForm(p => ({ ...p, dateOfJoining: e.target.value }))} /></div>
                  <div><label className={addLbl}>Retirement Date</label><input type="date" className={addInp} value={addForm.retirementDate} onChange={e => setAddForm(p => ({ ...p, retirementDate: e.target.value }))} /></div>
                </div>
              </form>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button type="submit" form="add-employee-form" disabled={addSaving} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
                {addSaving ? 'Saving...' : 'Save Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Excel Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowUploadModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Upload Employee Excel</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {(isSuperAdmin || isStateUser) && (
                <div>
                  <label className={addLbl}>University *</label>
                  <select className={addInp} value={uploadUniversityId} onChange={e => setUploadUniversityId(e.target.value)}>
                    <option value="">Select University</option>
                    {universities.map(u => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                  </select>
                </div>
              )}
              {!isSuperAdmin && !isStateUser && user?.university && (
                <div className="bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 rounded-lg px-4 py-2.5">
                  <p className="text-sm text-primary-800 dark:text-primary-300">Uploading for: <span className="font-semibold">{user.university.name} ({user.university.code})</span></p>
                </div>
              )}
              <div
                onClick={() => uploadFileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-500/5 transition-colors"
              >
                <input ref={uploadFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
                {uploadFile ? (
                  <div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{uploadFile.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Click or Drag file to upload</p>
                    <p className="text-sm text-gray-400 mt-1">Supported formats: .xlsx, .xls, .csv</p>
                  </div>
                )}
              </div>
              {uploadError && <div className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">{uploadError}</div>}
              {uploadResult && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Upload Results</p>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center p-2 bg-white dark:bg-gray-900 rounded-lg"><p className="text-xl font-bold text-gray-700 dark:text-gray-300">{uploadResult.total}</p><p className="text-[10px] text-gray-500">Total</p></div>
                    <div className="text-center p-2 bg-green-50 dark:bg-green-500/10 rounded-lg"><p className="text-xl font-bold text-green-700 dark:text-green-400">{uploadResult.success}</p><p className="text-[10px] text-green-600">Imported</p></div>
                    <div className="text-center p-2 bg-red-50 dark:bg-red-500/10 rounded-lg"><p className="text-xl font-bold text-red-700 dark:text-red-400">{uploadResult.failed}</p><p className="text-[10px] text-red-600">Failed</p></div>
                  </div>
                  {uploadResult.errors.length > 0 && (
                    <div className="max-h-32 overflow-y-auto bg-red-50 dark:bg-red-500/10 rounded-lg p-3 space-y-1">
                      {uploadResult.errors.map((err, i) => <p key={i} className="text-xs text-red-600">{err}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800">
              <button onClick={downloadTemplate} className="px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">Download Template</button>
              <div className="flex gap-3">
                <button onClick={() => setShowUploadModal(false)} className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                <button onClick={handleUpload} disabled={uploading || !uploadFile} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
                  {uploading ? 'Uploading...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
