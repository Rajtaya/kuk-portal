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
  const exportRef = useRef<HTMLDivElement>(null);

  const fixedUniversityId = !isSuperAdmin ? user?.university?.id || '' : '';

  const [form, setForm] = useState({
    universityId: '', departmentId: '', subject: '',
    designation: 'Professor', postType: 'BUDGETED', sanctionedCount: 0,
  });

  useEffect(() => {
    loadData();
    if (isSuperAdmin) api.get<University[]>('/universities').then(setUniversities);
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
    setForm({ universityId: fixedUniversityId, departmentId: '', subject: '', designation: 'Professor', postType: 'BUDGETED', sanctionedCount: 0 });
    setShowForm(true);
    setError('');
  }

  function openEdit(p: SanctionedPost) {
    setEditing(p);
    setForm({
      universityId: p.universityId,
      departmentId: p.departmentId,
      subject: p.subject || '',
      designation: p.designation,
      postType: p.postType || 'BUDGETED',
      sanctionedCount: p.sanctionedCount,
    });
    setShowForm(true);
    setError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        universityId: fixedUniversityId || form.universityId,
        sanctionedCount: Number(form.sanctionedCount),
        subject: form.subject || null,
      };
      if (editing) {
        await api.put(`/sanctioned-posts/${editing.id}`, payload);
      } else {
        await api.post('/sanctioned-posts', payload);
      }
      setShowForm(false);
      toast(editing ? 'Post updated' : 'Post created', 'success');
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

  const totals = vacancyData.reduce(
    (acc, r) => ({ sanctioned: acc.sanctioned + r.sanctioned, filled: acc.filled + r.filled, vacant: acc.vacant + r.vacant, excess: acc.excess + (r.excess || 0) }),
    { sanctioned: 0, filled: 0, vacant: 0, excess: 0 },
  );

  // Available filter options (computed from data)
  const availableFilters = useMemo(() => {
    const src = tab === 'vacancy' ? vacancyData : posts;
    if (!src.length) return [];
    const defs: { key: string; label: string; values: string[] }[] = [];

    if (isSuperAdmin) {
      const unis = [...new Set(tab === 'vacancy'
        ? vacancyData.map(r => r.universityCode)
        : posts.map(p => p.university?.code).filter(Boolean) as string[]
      )].sort();
      if (unis.length > 1) defs.push({ key: 'university', label: 'University', values: unis });
    }

    const desigs = [...new Set(tab === 'vacancy'
      ? vacancyData.map(r => r.designation)
      : posts.map(p => p.designation)
    )].sort();
    if (desigs.length > 1) defs.push({ key: 'designation', label: 'Designation', values: desigs });

    const types = [...new Set(tab === 'vacancy'
      ? vacancyData.map(r => r.postType)
      : posts.map(p => p.postType)
    )].sort();
    if (types.length > 1) defs.push({ key: 'postType', label: 'Post Type', values: types });

    const subjects = [...new Set(tab === 'vacancy'
      ? vacancyData.map(r => r.subject).filter(Boolean) as string[]
      : posts.map(p => p.subject).filter(Boolean) as string[]
    )].sort();
    if (subjects.length > 1) defs.push({ key: 'subject', label: 'Subject', values: subjects });

    return defs;
  }, [tab, posts, vacancyData, isSuperAdmin]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  function clearAllFilters() { setFilters({}); setSearch(''); }

  function matchesFilters(row: any, isVacancy: boolean): boolean {
    return Object.entries(filters).every(([key, val]) => {
      if (!val) return true;
      if (key === 'university') return isVacancy ? row.universityCode === val : row.university?.code === val;
      if (key === 'designation') return row.designation === val;
      if (key === 'postType') return row.postType === val;
      if (key === 'subject') return (row.subject || '') === val;
      return true;
    });
  }

  // Filtered + sorted vacancy data
  const filteredVacancy = useMemo(() => {
    let data = vacancyData.filter(r => matchesFilters(r, true));
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
    let data = posts.filter(p => matchesFilters(p, false));
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
      if (sortCol === 'university') { av = a.university?.code ?? ''; bv = b.university?.code ?? ''; }
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

  const numericCols = new Set(['sanctioned', 'filled', 'vacant', 'excess', 'sanctionedCount']);

  const vacancyExportCols: ExportColumn[] = [
    { key: 'universityCode', label: 'University' },
    { key: 'department', label: 'Department' },
    { key: 'subject', label: 'Subject' },
    { key: 'designation', label: 'Designation' },
    { key: 'postType', label: 'Type' },
    { key: 'sanctioned', label: 'Sanctioned' },
    { key: 'filled', label: 'Filled' },
    { key: 'vacant', label: 'Vacant' },
    { key: 'excess', label: 'Excess', value: (r) => r.excess || 0 },
  ];

  function doExport(fmt: 'csv' | 'excel' | 'pdf') {
    const data = tab === 'vacancy' ? sortedVacancy : [];
    if (!data.length) { toast('Nothing to export', 'error'); return; }
    setExportOpen(false);
    if (fmt === 'csv') exportToCSV('vacancy-report', vacancyExportCols, data);
    else if (fmt === 'excel') exportToExcel('vacancy-report', vacancyExportCols, data);
    else exportToPDF('Vacancy Report', vacancyExportCols, data);
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
  const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  function SortIcon({ col }: { col: string }) {
    if (sortCol === col) {
      return (
        <svg className="w-3.5 h-3.5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
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
    ...(isSuperAdmin ? [{ key: 'university', label: 'University' }] : []),
    { key: 'department', label: 'Department' },
    { key: 'subject', label: 'Subject' },
    { key: 'designation', label: 'Designation' },
    { key: 'postType', label: 'Type' },
    { key: 'sanctionedCount', label: 'Sanctioned' },
  ];

  const vacancyHeaders = [
    { key: 'universityCode', label: 'University' },
    { key: 'department', label: 'Department' },
    { key: 'subject', label: 'Subject' },
    { key: 'designation', label: 'Designation' },
    { key: 'postType', label: 'Type' },
    { key: 'sanctioned', label: 'Sanctioned' },
    { key: 'filled', label: 'Filled' },
    { key: 'vacant', label: 'Vacant' },
    { key: 'excess', label: 'Excess' },
  ];

  const activeCount = tab === 'manage' ? sortedPosts.length : sortedVacancy.length;
  const totalCount = tab === 'manage' ? posts.length : vacancyData.length;

  return (
    <div>
      <Breadcrumb items={[{ label: 'Sanctioned Posts', icon: 'sanction' }]} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sanctioned Posts</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {user?.role === 'UNIVERSITY_ADMIN' ? `Manage posts for ${user?.university?.name}` : 'Post management & vacancy analysis'}
          </p>
        </div>
        {canWrite && tab === 'manage' && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Post
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {canWrite && (
          <button onClick={() => { setTab('manage'); setSearch(''); setSortCol(null); setFilters({}); }} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'manage' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              Manage Posts
            </span>
          </button>
        )}
        <button onClick={() => { setTab('vacancy'); setSearch(''); setSortCol(null); setFilters({}); }} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'vacancy' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Vacancy Report
          </span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Sanctioned', value: totals.sanctioned, color: 'from-blue-500 to-blue-600', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z' },
          { label: 'Filled', value: totals.filled, color: 'from-emerald-500 to-emerald-600', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Vacant', value: totals.vacant, color: 'from-red-500 to-red-600', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
          { label: 'Excess', value: totals.excess, color: 'from-amber-500 to-amber-600', icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm shrink-0`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value.toLocaleString()}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{editing ? 'Edit Sanctioned Post' : 'Add Sanctioned Post'}</h3>
          {error && <div className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

          {!isSuperAdmin && user?.university && (
            <div className="bg-primary-50 border border-primary-200 dark:bg-primary-500/10 dark:border-primary-500/20 rounded-lg px-4 py-2.5 mb-4">
              <p className="text-sm text-primary-800 dark:text-primary-300">University: <span className="font-semibold">{user.university.name} ({user.university.code})</span></p>
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {isSuperAdmin && (
                <div>
                  <label className={lbl}>University *</label>
                  <select className={inp} value={form.universityId} onChange={(e) => update('universityId', e.target.value)} required>
                    <option value="">Select University</option>
                    {universities.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className={lbl}>Department *</label>
                <select className={inp} value={form.departmentId} onChange={(e) => update('departmentId', e.target.value)} required>
                  <option value="">Select Department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Subject</label>
                <input className={inp} value={form.subject} onChange={(e) => update('subject', e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className={lbl}>Designation *</label>
                <select className={inp} value={form.designation} onChange={(e) => update('designation', e.target.value)}>
                  {designations.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Type *</label>
                <select className={inp} value={form.postType} onChange={(e) => update('postType', e.target.value)}>
                  {postTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Sanctioned Posts *</label>
                <input type="number" min={0} className={inp} value={form.sanctionedCount} onChange={(e) => update('sanctionedCount', e.target.value)} required />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Post'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 dark:border-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        {/* Table Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/60 dark:to-gray-900">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tab === 'manage' ? 'from-primary-500 to-primary-600' : 'from-indigo-500 to-indigo-600'} flex items-center justify-center shadow-sm`}>
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={tab === 'manage'
                  ? 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75'
                  : 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z'
                } />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{tab === 'manage' ? 'Manage Posts' : 'Vacancy Report'}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {activeCount} records{(search || activeFilterCount > 0) ? ` (filtered from ${totalCount})` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filter toggle */}
            {availableFilters.length > 0 && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">{activeFilterCount}</span>
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
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-56 pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
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
            {tab === 'vacancy' && (
              <div className="relative shrink-0" ref={exportRef}>
                <button onClick={() => setExportOpen(!exportOpen)} disabled={!vacancyData.length} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
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
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && availableFilters.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40">
            <div className="flex flex-wrap items-end gap-3">
              {availableFilters.map(f => (
                <div key={f.key} className="min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                  <select
                    value={filters[f.key] || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all ${
                      filters[f.key]
                        ? 'border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-200'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <option value="">All {f.label}s</option>
                    {f.values.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              ))}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active filter pills (when panel is collapsed) */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="px-6 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-blue-50/50 dark:bg-blue-500/5 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Filtered by:</span>
            {Object.entries(filters).filter(([, v]) => v).map(([key, val]) => {
              const fd = availableFilters.find(f => f.key === key);
              return (
                <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                  {fd?.label}: {val}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, [key]: '' }))}
                    className="ml-0.5 hover:text-blue-600 dark:hover:text-blue-100"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              );
            })}
            <button onClick={clearAllFilters} className="text-xs text-red-500 dark:text-red-400 hover:underline ml-1">Clear all</button>
          </div>
        )}

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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="text-center align-middle px-4 py-3.5 font-semibold text-xs uppercase tracking-wider w-10">#</th>
                      {manageHeaders.map(h => (
                        <th
                          key={h.key}
                          onClick={() => toggleSort(h.key)}
                          className={`group px-4 py-3.5 align-middle font-semibold text-xs uppercase tracking-wider cursor-pointer hover:bg-slate-700 transition-colors select-none ${numericCols.has(h.key) ? 'text-center' : 'text-left'}`}
                        >
                          <div className={`flex items-center gap-1.5 ${numericCols.has(h.key) ? 'justify-center' : ''}`}>
                            <span>{h.label}</span>
                            <SortIcon col={h.key} />
                          </div>
                        </th>
                      ))}
                      {canWrite && <th className="px-4 py-3.5 text-center align-middle font-semibold text-xs uppercase tracking-wider">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPosts.map((p, i) => (
                      <tr key={p.id} className={`border-b border-gray-50 dark:border-gray-800 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'} hover:bg-blue-50/40 dark:hover:bg-gray-800/60`}>
                        <td className="px-4 py-3 text-center align-middle text-gray-400 text-xs font-mono">{i + 1}</td>
                        {isSuperAdmin && <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{p.university?.code}</td>}
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{p.department?.name}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{p.subject || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{p.designation}</td>
                        <td className="px-4 py-3"><Badge value={p.postType} /></td>
                        <td className="px-4 py-3 text-center align-middle font-bold text-gray-900 dark:text-gray-100 tabular-nums">{p.sanctionedCount}</td>
                        {canWrite && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors" title="Edit">
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="text-center align-middle px-4 py-3.5 font-semibold text-xs uppercase tracking-wider w-10">#</th>
                      {vacancyHeaders.map(h => (
                        <th
                          key={h.key}
                          onClick={() => toggleSort(h.key)}
                          className={`group px-4 py-3.5 align-middle font-semibold text-xs uppercase tracking-wider cursor-pointer hover:bg-slate-700 transition-colors select-none ${numericCols.has(h.key) ? 'text-center' : 'text-left'}`}
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
                    {sortedVacancy.map((row, i) => (
                      <tr key={row.id} className={`border-b border-gray-50 dark:border-gray-800 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'} hover:bg-blue-50/40 dark:hover:bg-gray-800/60`}>
                        <td className="px-4 py-3 text-center align-middle text-gray-400 text-xs font-mono">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.universityCode}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.department}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.subject || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.designation}</td>
                        <td className="px-4 py-3"><Badge value={row.postType} /></td>
                        <td className="px-4 py-3 text-center align-middle font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{row.sanctioned}</td>
                        <td className="px-4 py-3 text-center align-middle font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{row.filled}</td>
                        <td className="px-4 py-3 text-center align-middle font-semibold tabular-nums">
                          {row.vacant > 0 ? <span className="text-red-700 dark:text-red-400">{row.vacant}</span> : <span className="text-gray-400">0</span>}
                        </td>
                        <td className="px-4 py-3 text-center align-middle font-semibold tabular-nums">
                          {(row.excess || 0) > 0 ? <span className="text-amber-700 dark:text-amber-400">{row.excess}</span> : <span className="text-gray-400">0</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-gray-800/60 border-t-2 border-slate-300 dark:border-gray-700 font-bold text-gray-900 dark:text-gray-100">
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" colSpan={5}>Total</td>
                      <td className="px-4 py-3 text-center tabular-nums">{totals.sanctioned.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-emerald-700 dark:text-emerald-400 tabular-nums">{totals.filled.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-red-700 dark:text-red-400 tabular-nums">{totals.vacant.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-amber-700 dark:text-amber-400 tabular-nums">{totals.excess.toLocaleString()}</td>
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
