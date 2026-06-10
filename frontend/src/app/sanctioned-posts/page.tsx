'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Department, University } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { exportToCSV, exportToExcel, exportToPDF, ExportColumn } from '@/lib/export-utils';

interface SanctionedPost {
  id: string;
  universityId: string;
  departmentId: string;
  subject?: string;
  designation: string;
  postType: string;
  sanctionedCount: number;
  university?: { name: string; code: string };
  department?: { name: string };
}

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

const designations = ['Professor','Associate Professor','Assistant Professor','Other Teaching Posts'];
const postTypes = ['BUDGETED','SFS','CONTRACTUAL'];

export default function SanctionedPostsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isStateUser = user?.role === 'STATE_USER';
  const canWrite = isSuperAdmin || isStateUser;
  const { toast } = useToast();

  const [tab, setTab] = useState<'manage' | 'vacancy'>(canWrite ? 'manage' : 'vacancy');
  const [posts, setPosts] = useState<SanctionedPost[]>([]);
  const [vacancyData, setVacancyData] = useState<VacancyRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SanctionedPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [exportOpen, setExportOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const exportRef = useRef<HTMLDivElement>(null);

  const fixedUniversityId = (!isSuperAdmin && !isStateUser) ? user?.university?.id || '' : '';

  const [form, setForm] = useState({
    universityId: '', departmentId: '', subject: '',
    postType: 'BUDGETED',
  });
  const emptyCounts: Record<string, number> = Object.fromEntries(designations.map(d => [d, 0]));
  const [desigCounts, setDesigCounts] = useState<Record<string, number>>(emptyCounts);

  useEffect(() => {
    loadData();
    if (isSuperAdmin || isStateUser) api.get<University[]>('/universities').then(setUniversities);
    api.get<{ id: string; name: string }[]>('/masters/subjects').then(setSubjects);
  }, []);

  useEffect(() => {
    const uniId = fixedUniversityId || form.universityId;
    if (uniId) api.get<Department[]>(`/departments?universityId=${uniId}`).then(setDepartments);
  }, [fixedUniversityId, form.universityId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function loadData() {
    setLoading(true);
    Promise.all([
      api.get<SanctionedPost[]>('/sanctioned-posts'),
      api.get<VacancyRow[]>('/sanctioned-posts/vacancy-report'),
    ]).then(([p, v]) => { setPosts(p); setVacancyData(v); }).finally(() => setLoading(false));
  }

  function openCreate() {
    setEditing(null);
    setForm({ universityId: fixedUniversityId, departmentId: '', subject: '', postType: 'BUDGETED' });
    setDesigCounts({ ...emptyCounts });
    setShowForm(true);
    setError('');
  }

  function openEdit(p: SanctionedPost) {
    setEditing(p);
    setForm({
      universityId: p.universityId,
      departmentId: p.departmentId,
      subject: p.subject || '',
      postType: p.postType || 'BUDGETED',
    });
    const counts = { ...emptyCounts };
    counts[p.designation] = p.sanctionedCount;
    setDesigCounts(counts);
    setShowForm(true);
    setError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const uniId = fixedUniversityId || form.universityId;
      if (editing) {
        await api.put(`/sanctioned-posts/${editing.id}`, {
          universityId: uniId,
          departmentId: form.departmentId,
          subject: form.subject || null,
          designation: editing.designation,
          postType: form.postType,
          sanctionedCount: Number(desigCounts[editing.designation] || 0),
        });
      } else {
        const toCreate = designations.filter(d => (desigCounts[d] || 0) > 0);
        if (!toCreate.length) { setError('Enter count for at least one designation'); setSaving(false); return; }
        for (const d of toCreate) {
          await api.post('/sanctioned-posts', {
            universityId: uniId,
            departmentId: form.departmentId,
            subject: form.subject || null,
            designation: d,
            postType: form.postType,
            sanctionedCount: Number(desigCounts[d]),
          });
        }
      }
      setShowForm(false);
      toast(editing ? 'Post updated' : 'Posts created', 'success');
      loadData();
    } catch (err: any) { setError(err.message); toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sanctioned post?')) return;
    await api.delete(`/sanctioned-posts/${id}`);
    toast('Post deleted', 'success');
    loadData();
  }

  function update(key: string, value: string | number) { setForm((prev) => ({ ...prev, [key]: value })); }

  // University filter (stat cards + table) — driven by filter panel
  const uniOnlyVacancy = useMemo(() => {
    if (!filters.university) return vacancyData;
    return vacancyData.filter(r => r.universityCode === filters.university);
  }, [vacancyData, filters.university]);

  // University + type filter (for table data)
  const uniFilteredVacancy = useMemo(() => {
    let data = uniOnlyVacancy;
    if (selectedType !== 'all') data = data.filter(r => r.postType === selectedType);
    return data;
  }, [uniOnlyVacancy, selectedType]);

  const uniFilteredPosts = useMemo(() => {
    let data = posts;
    if (filters.university) data = data.filter(p => p.university?.code === filters.university);
    if (selectedType !== 'all') data = data.filter(p => p.postType === selectedType);
    return data;
  }, [posts, filters.university, selectedType]);

  const totals = uniOnlyVacancy.reduce(
    (acc, r) => ({ sanctioned: acc.sanctioned + r.sanctioned, filled: acc.filled + r.filled, vacant: acc.vacant + r.vacant, excess: acc.excess + (r.excess || 0) }),
    { sanctioned: 0, filled: 0, vacant: 0, excess: 0 },
  );
  const fillRate = totals.sanctioned > 0 ? Math.round((totals.filled / totals.sanctioned) * 100) : 0;

  const budgeted = uniOnlyVacancy.filter(r => r.postType === 'BUDGETED').reduce(
    (acc, r) => ({ total: acc.total + r.sanctioned, filled: acc.filled + r.filled, vacant: acc.vacant + r.vacant }),
    { total: 0, filled: 0, vacant: 0 },
  );
  const sfs = uniOnlyVacancy.filter(r => r.postType === 'SFS').reduce(
    (acc, r) => ({ total: acc.total + r.sanctioned, filled: acc.filled + r.filled, vacant: acc.vacant + r.vacant }),
    { total: 0, filled: 0, vacant: 0 },
  );

  // Available filter options (computed from data)
  const availableFilters = useMemo(() => {
    const src = tab === 'vacancy' ? vacancyData : posts;
    if (!src.length) return [];
    const defs: { key: string; label: string; values: string[] }[] = [];

    if (isSuperAdmin || isStateUser) {
      const unis = [...new Set(tab === 'vacancy'
        ? vacancyData.map(r => r.universityCode)
        : posts.map(p => p.university?.code).filter(Boolean) as string[]
      )].sort();
      if (unis.length > 1) defs.push({ key: 'university', label: 'University', values: unis });
    }

    defs.push({ key: 'subject', label: 'Subject', values: subjects.map(s => s.name) });

    const desigs = [...new Set(tab === 'vacancy'
      ? vacancyData.map(r => r.designation)
      : posts.map(p => p.designation)
    )].sort();
    if (desigs.length > 1) defs.push({ key: 'designation', label: 'Designation', values: desigs });

    const depts = [...new Set(tab === 'vacancy'
      ? vacancyData.map(r => r.department).filter(Boolean)
      : posts.map(p => p.department?.name).filter(Boolean) as string[]
    )].sort();
    if (depts.length > 1) defs.push({ key: 'department', label: 'Department', values: depts });

    defs.push({ key: 'postType', label: 'Post Type', values: [...postTypes] });

    return defs;
  }, [tab, posts, vacancyData, isSuperAdmin, subjects]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  function clearAllFilters() { setFilters({}); setSearch(''); }

  function matchesFilters(row: any, isVacancy: boolean): boolean {
    return Object.entries(filters).every(([key, val]) => {
      if (!val) return true;
      if (key === 'university') return isVacancy ? row.universityCode === val : row.university?.code === val;
      if (key === 'designation') return row.designation === val;
      if (key === 'postType') return row.postType === val;
      if (key === 'subject') return (row.subject || '') === val;
      if (key === 'department') return isVacancy ? row.department === val : row.department?.name === val;
      return true;
    });
  }

  // Filtered + sorted vacancy data
  const filteredVacancy = useMemo(() => {
    let data = uniFilteredVacancy.filter(r => matchesFilters(r, true));
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        [r.universityCode, r.university, r.department, r.subject, r.designation, r.postType]
          .some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }
    return data;
  }, [vacancyData, search, filters]);

  const sortedVacancy = useMemo(() => {
    if (!sortCol) return filteredVacancy;
    return [...filteredVacancy].sort((a, b) => {
      const av = (a as any)[sortCol] ?? '';
      const bv = (b as any)[sortCol] ?? '';
      const an = Number(av), bn = Number(bv);
      if (!isNaN(an) && !isNaN(bn)) return sortDir === 'asc' ? an - bn : bn - an;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [filteredVacancy, sortCol, sortDir]);

  // Filtered + sorted manage data
  const filteredPosts = useMemo(() => {
    let data = uniFilteredPosts.filter(p => matchesFilters(p, false));
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(p =>
        [p.university?.code, p.university?.name, p.department?.name, p.subject, p.designation, p.postType, String(p.sanctionedCount)]
          .some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }
    return data;
  }, [posts, search, filters]);

  const sortedPosts = useMemo(() => {
    if (!sortCol) return filteredPosts;
    return [...filteredPosts].sort((a, b) => {
      let av: any, bv: any;
      if (sortCol === 'university') { av = a.university?.name ?? ''; bv = b.university?.name ?? ''; }
      else if (sortCol === 'department') { av = a.department?.name ?? ''; bv = b.department?.name ?? ''; }
      else if (sortCol === 'sanctionedCount') { av = a.sanctionedCount; bv = b.sanctionedCount; }
      else { av = (a as any)[sortCol] ?? ''; bv = (b as any)[sortCol] ?? ''; }
      const an = Number(av), bn = Number(bv);
      if (!isNaN(an) && !isNaN(bn)) return sortDir === 'asc' ? an - bn : bn - an;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [filteredPosts, sortCol, sortDir]);

  function toggleSort(col: string) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  const numericCols = new Set(['sanctioned', 'filled', 'vacant', 'excess', 'sanctionedCount', 'fillRate']);

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

  const manageExportCols: ExportColumn[] = [
    ...((isSuperAdmin || isStateUser) ? [{ key: 'university', label: 'University Name', value: (r: any) => r.university?.name || '' }] : []),
    { key: 'subject', label: 'Subject' },
    { key: 'department', label: 'Department', value: (r: any) => r.department?.name || '' },
    { key: 'designation', label: 'Designation' },
    { key: 'postType', label: 'Type' },
    { key: 'sanctionedCount', label: 'Sanctioned' },
  ];

  function doExport(fmt: 'csv' | 'excel' | 'pdf') {
    const isManage = tab === 'manage';
    const data: any[] = isManage ? sortedPosts : sortedVacancy;
    const cols = isManage ? manageExportCols : vacancyExportCols;
    const title = isManage ? 'Sanctioned Posts' : 'Vacancy Report';
    if (!data.length) { toast('Nothing to export', 'error'); return; }
    setExportOpen(false);
    if (fmt === 'csv') exportToCSV(title.toLowerCase().replace(/ /g, '-'), cols, data);
    else if (fmt === 'excel') exportToExcel(title.toLowerCase().replace(/ /g, '-'), cols, data);
    else exportToPDF(title, cols, data);
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
  const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  function SortIcon({ col }: { col: string }) {
    if (sortCol === col) {
      return (
        <svg className="w-3.5 h-3.5 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={sortDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
        </svg>
      );
    }
    return (
      <svg className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }

  const manageHeaders = [
    ...((isSuperAdmin || isStateUser) ? [{ key: 'university', label: 'University Name' }] : []),
    { key: 'subject', label: 'Subject' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'postType', label: 'Type' },
    { key: 'sanctionedCount', label: 'Sanctioned' },
  ];

  const vacancyHeaders = [
    ...((isSuperAdmin || isStateUser) ? [{ key: 'university', label: 'University Name' }] : []),
    { key: 'subject', label: 'Subject' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'postType', label: 'Type' },
    { key: 'sanctioned', label: 'Sanctioned' },
    { key: 'filled', label: 'Filled' },
    { key: 'vacant', label: 'Vacant' },
    { key: 'excess', label: 'Excess' },
    { key: 'fillRate', label: 'Fill %' },
  ];

  const activeCount = tab === 'manage' ? sortedPosts.length : sortedVacancy.length;
  const totalCount = tab === 'manage' ? uniFilteredPosts.length : uniFilteredVacancy.length;
  const selectedUniName = useMemo(() => {
    if (!filters.university) return 'All Universities';
    const u = universities.find(u => u.code === filters.university);
    return u ? u.name : filters.university;
  }, [filters.university, universities]);

  return (
    <div>
      <Breadcrumb items={[{ label: 'Sanctioned Posts', icon: 'sanction' }]} />

      {/* Header row */}
      <div className="flex items-center gap-3 mt-2 overflow-x-auto">
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

        <div className="flex items-center gap-2 rounded-xl border-2 border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/5 px-4 py-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">Budgeted</span>
          <span className="text-lg font-bold tabular-nums text-indigo-600 dark:text-indigo-400 ml-1">{budgeted.total.toLocaleString()}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Total</span>
          <span className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{budgeted.filled.toLocaleString()}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Filled</span>
          <span className="text-lg font-bold tabular-nums text-red-500 dark:text-red-400">{budgeted.vacant.toLocaleString()}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Vacant</span>
        </div>

        <div className="flex items-center gap-2 rounded-xl border-2 border-orange-200 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-500/5 px-4 py-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide">SFS</span>
          <span className="text-lg font-bold tabular-nums text-orange-600 dark:text-orange-400 ml-1">{sfs.total.toLocaleString()}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Total</span>
          <span className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{sfs.filled.toLocaleString()}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Filled</span>
          <span className="text-lg font-bold tabular-nums text-red-500 dark:text-red-400">{sfs.vacant.toLocaleString()}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Vacant</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-40 pl-9 pr-8 py-1.5 text-sm border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button onClick={() => { setTab('manage'); setSearch(''); setSortCol(null); setFilters({}); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'manage' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              Manage
            </button>
            <button onClick={() => { setTab('vacancy'); setSearch(''); setSortCol(null); setFilters({}); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'vacancy' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              Vacancy
            </button>
          </div>

          {canWrite && tab === 'manage' && (
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm">
              <span className="text-base leading-none">+</span> Add
            </button>
          )}
          <div className="relative" ref={exportRef}>
              <button onClick={() => setExportOpen(!exportOpen)} disabled={tab === 'vacancy' ? !vacancyData.length : !posts.length} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
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


      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit Sanctioned Post' : 'Add Sanctioned Post'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {error && <div className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

              {!isSuperAdmin && !isStateUser && user?.university && (
                <div className="bg-primary-50 border border-primary-200 dark:bg-primary-500/10 dark:border-primary-500/20 rounded-lg px-4 py-2.5 mb-5">
                  <p className="text-sm text-primary-800 dark:text-primary-300">University: <span className="font-semibold">{user.university.name} ({user.university.code})</span></p>
                </div>
              )}

              <form id="sanctioned-post-form" onSubmit={handleSave}>
                {(isSuperAdmin || isStateUser) && (
                  <div className="mb-4">
                    <label className={lbl}>University *</label>
                    <select className={inp} value={form.universityId} onChange={(e) => update('universityId', e.target.value)} required>
                      <option value="">Select University</option>
                      {universities.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                    </select>
                  </div>
                )}

                <div className={`grid gap-4 mb-5 ${editing ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  <div>
                    <label className={lbl}>Department *</label>
                    <select className={inp} value={form.departmentId} onChange={(e) => update('departmentId', e.target.value)} required>
                      <option value="">Select Department</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Subject</label>
                    <select className={inp} value={form.subject} onChange={(e) => update('subject', e.target.value)}>
                      <option value="">Select Subject</option>
                      {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  {!editing && (
                    <div>
                      <label className={lbl}>Post Type *</label>
                      <select className={inp} value={form.postType} onChange={(e) => update('postType', e.target.value)}>
                        {postTypes.map((t) => <option key={t} value={t}>{t === 'BUDGETED' ? 'Budgeted' : t === 'SFS' ? 'SFS' : 'Contractual'}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 text-center mb-3">Designation & Count</p>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-300">Designation</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-300 w-28">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editing ? [editing.designation] : designations).map((d) => (
                        <tr key={d} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{d}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              className={`${inp} text-right`}
                              value={desigCounts[d] || ''}
                              onChange={(e) => setDesigCounts(prev => ({ ...prev, [d]: Number(e.target.value) || 0 }))}
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </form>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button type="submit" form="sanctioned-post-form" disabled={saving} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="mt-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">


        {/* Manage Tab */}
        {tab === 'manage' && (
          <>
            {loading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : sortedPosts.length === 0 ? (
              <EmptyState
                icon={search ? '🔍' : '📋'}
                title={search ? 'No matching posts' : 'No sanctioned posts yet'}
                description={search ? 'Try a different search term.' : 'Create your first sanctioned post to start tracking vacancies.'}
                action={!search && canWrite ? { label: 'Add Post', onClick: openCreate } : undefined}
              />
            ) : (
              <div className="overflow-auto max-h-[70vh]">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-primary-700 text-white">
                      <th className="sticky top-0 z-10 bg-primary-700 text-center align-middle px-4 py-3.5 font-semibold text-xs uppercase tracking-wider w-10 border border-gray-300 dark:border-gray-600">#</th>
                      {manageHeaders.map(h => (
                        <th
                          key={h.key}
                          onClick={() => toggleSort(h.key)}
                          className={`sticky top-0 z-10 bg-primary-700 group px-4 py-3.5 align-middle font-semibold text-xs uppercase tracking-wider cursor-pointer hover:bg-primary-600 transition-colors select-none border border-gray-300 dark:border-gray-600 ${numericCols.has(h.key) ? 'text-center' : 'text-left'}`}
                        >
                          <div className={`flex items-center gap-1.5 ${numericCols.has(h.key) ? 'justify-center' : ''}`}>
                            <span>{h.label}</span>
                            <SortIcon col={h.key} />
                          </div>
                        </th>
                      ))}
                      {canWrite && <th className="sticky top-0 z-10 bg-primary-700 px-4 py-3.5 text-center align-middle font-semibold text-xs uppercase tracking-wider border border-gray-300 dark:border-gray-600">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPosts.map((p, i) => (
                      <tr key={p.id} className={`border-b border-gray-50 dark:border-gray-800 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'} hover:bg-primary-50/40 dark:hover:bg-gray-800/60`}>
                        <td className="px-4 py-3 text-center align-middle text-gray-400 text-xs font-mono border border-gray-200 dark:border-gray-700">{i + 1}</td>
                        {(isSuperAdmin || isStateUser) && <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">{p.university?.name}</td>}
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{p.subject || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{p.department?.name}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{p.designation}</td>
                        <td className="px-4 py-3 border border-gray-200 dark:border-gray-700"><Badge value={p.postType} /></td>
                        <td className="px-4 py-3 text-center align-middle font-bold text-gray-900 dark:text-gray-100 tabular-nums border border-gray-200 dark:border-gray-700">{p.sanctionedCount}</td>
                        {canWrite && (
                          <td className="px-4 py-3 text-center border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-primary-50 dark:hover:bg-primary-500/10 text-primary-600 dark:text-primary-400 transition-colors" title="Edit">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                              </button>
                              <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 dark:text-red-400 transition-colors" title="Delete">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Vacancy Tab */}
        {tab === 'vacancy' && (
          <>
            {loading ? (
              <TableSkeleton rows={8} cols={9} />
            ) : sortedVacancy.length === 0 ? (
              <EmptyState
                icon={search ? '🔍' : '📊'}
                title={search ? 'No matching records' : 'No vacancy data'}
                description={search ? 'Try a different search term.' : 'Vacancy figures appear once sanctioned posts and employees are recorded.'}
              />
            ) : (
              <div className="overflow-auto max-h-[70vh]">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-primary-700 text-white">
                      <th className="sticky top-0 z-10 bg-primary-700 text-center align-middle px-4 py-3.5 font-semibold text-xs uppercase tracking-wider w-10 border border-gray-300 dark:border-gray-600">#</th>
                      {vacancyHeaders.map(h => (
                        <th
                          key={h.key}
                          onClick={() => toggleSort(h.key)}
                          className={`sticky top-0 z-10 bg-primary-700 group px-4 py-3.5 align-middle font-semibold text-xs uppercase tracking-wider cursor-pointer hover:bg-primary-600 transition-colors select-none border border-gray-300 dark:border-gray-600 ${numericCols.has(h.key) ? 'text-center' : 'text-left'}`}
                        >
                          <div className={`flex items-center gap-1.5 ${numericCols.has(h.key) ? 'justify-center' : ''}`}>
                            <span>{h.label}</span>
                            <SortIcon col={h.key} />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedVacancy.map((row, i) => {
                      const rowFill = row.sanctioned > 0 ? Math.round((row.filled / row.sanctioned) * 100) : 0;
                      const vacantPct = row.sanctioned > 0 ? row.vacant / row.sanctioned : 0;
                      return (
                        <tr key={row.id} className={`border-b border-gray-50 dark:border-gray-800 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'} hover:bg-primary-50/40 dark:hover:bg-gray-800/60`}>
                          <td className="px-4 py-3 text-center align-middle text-gray-400 text-xs font-mono border border-gray-200 dark:border-gray-700">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">{row.university}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{row.subject || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{row.department}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{row.designation}</td>
                          <td className="px-4 py-3 border border-gray-200 dark:border-gray-700"><Badge value={row.postType} /></td>
                          <td className="px-4 py-3 text-center align-middle font-semibold text-gray-900 dark:text-gray-100 tabular-nums border border-gray-200 dark:border-gray-700">{row.sanctioned}</td>
                          <td className="px-4 py-3 text-center align-middle font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums border border-gray-200 dark:border-gray-700">{row.filled}</td>
                          <td className={`px-4 py-3 text-center align-middle font-semibold tabular-nums border border-gray-200 dark:border-gray-700 ${row.vacant > 0 ? (vacantPct >= 0.5 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-orange-50 dark:bg-orange-500/5') : ''}`}>
                            {row.vacant > 0 ? <span className={vacantPct >= 0.5 ? 'text-red-700 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}>{row.vacant}</span> : <span className="text-gray-400">0</span>}
                          </td>
                          <td className="px-4 py-3 text-center align-middle font-semibold tabular-nums border border-gray-200 dark:border-gray-700">
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
                      <td className="px-4 py-3 border border-gray-200 dark:border-gray-700" colSpan={5}>Total</td>
                      <td className="px-4 py-3 text-center tabular-nums border border-gray-200 dark:border-gray-700">{totals.sanctioned.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-emerald-700 dark:text-emerald-400 tabular-nums border border-gray-200 dark:border-gray-700">{totals.filled.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-red-700 dark:text-red-400 tabular-nums border border-gray-200 dark:border-gray-700">{totals.vacant.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-amber-700 dark:text-amber-400 tabular-nums border border-gray-200 dark:border-gray-700">{totals.excess.toLocaleString()}</td>
                      <td className={`px-3 py-3 text-center text-sm font-bold tabular-nums border border-gray-200 dark:border-gray-700 ${fillRate >= 75 ? 'text-emerald-600 dark:text-emerald-400' : fillRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{fillRate}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        {activeCount > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Showing {activeCount} of {totalCount} records</span>
            <span>Click column headers to sort</span>
          </div>
        )}
      </div>
    </div>
  );
}
