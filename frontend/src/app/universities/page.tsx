'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { University } from '@/lib/types';
import { CardSkeleton } from '@/components/ui/skeleton';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useToast } from '@/components/ui/toast';

type SortKey = 'departments' | 'employees' | 'name';

const FALLBACK_LOGOS: Record<string, string> = {
  KUK: '/logos/KUK.png', MDU: '/logos/MDU.png', CDLU: '/logos/CDLU.jpg',
  CRSU: '/logos/CRSU.png', CBLU: '/logos/CBLU.png', GU: '/logos/GU.jpg',
  MVSU: '/logos/MVSU.png', IGU: '/logos/IGU.jpg', BPSMV: '/logos/BPSMV.png',
  GJU: '/logos/GJU.png', CCSHAU: '/logos/CCSHAU.png', DCRUST: '/logos/DCRUST.jpg',
};

const FALLBACK_WEBSITES: Record<string, string> = {
  KUK: 'https://www.kuk.ac.in',
  MDU: 'https://www.mdu.ac.in',
  CDLU: 'https://www.cdlu.ac.in',
  CRSU: 'https://www.crsu.ac.in',
  GJU: 'https://www.gjust.ac.in',
  BPSMV: 'https://www.bpsmv.ac.in',
  CBLU: 'https://www.cblu.ac.in',
  GU: 'https://www.gurugramuniversity.ac.in',
  MVSU: 'https://www.mvsu.ac.in',
  IGU: 'https://www.igu.ac.in',
  CCSHAU: 'https://www.hau.ac.in',
  DCRUST: 'https://www.dcrustm.ac.in',
};

const CARD_COLORS = [
  'from-primary-500 to-primary-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-indigo-500 to-indigo-600',
  'from-pink-500 to-pink-600',
  'from-teal-500 to-teal-600',
  'from-orange-500 to-orange-600',
  'from-purple-500 to-purple-600',
  'from-lime-500 to-lime-600',
];

const emptyForm = { name: '', code: '', address: '', city: '', state: 'Haryana', website: '', email: '', phone: '', logoUrl: '' };

export default function UniversitiesPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { toast } = useToast();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('departments');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<University | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setLoading(true);
    api.get<University[]>('/universities').then(setUniversities).finally(() => setLoading(false));
  }

  const sorted = useMemo(() => {
    const arr = [...universities];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '');
      } else if (sortKey === 'employees') {
        cmp = (a._count?.employees || 0) - (b._count?.employees || 0);
      } else {
        cmp = (a._count?.departments || 0) - (b._count?.departments || 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [universities, sortKey, sortDir]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'departments', label: 'Departments' },
    { key: 'employees', label: 'Employees' },
    { key: 'name', label: 'Name' },
  ];

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
  }

  function openEdit(uni: University) {
    setEditing(uni);
    setForm({
      name: uni.name,
      code: uni.code,
      address: uni.address || '',
      city: uni.city || '',
      state: uni.state || 'Haryana',
      website: uni.website || '',
      email: uni.email || '',
      phone: uni.phone || '',
      logoUrl: uni.logoUrl || '',
    });
    setShowForm(true);
    setError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = { ...form };
      for (const k of ['address', 'city', 'website', 'email', 'phone', 'logoUrl']) {
        if (!payload[k]) payload[k] = undefined;
      }
      if (editing) {
        await api.put(`/universities/${editing.id}`, payload);
      } else {
        await api.post('/universities', payload);
      }
      setShowForm(false);
      toast(editing ? 'University updated' : 'University created', 'success');
      loadData();
    } catch (err: any) {
      setError(err.message);
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
  const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white whitespace-nowrap">Universities</h1>
        {universities.length > 0 && (
          <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-500/15 px-2.5 py-1 rounded-full whitespace-nowrap">
            {universities.length}
          </span>
        )}
        <div className="flex-1" />
        {isSuperAdmin && (
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors whitespace-nowrap"
          >
            Add University
          </button>
        )}
        <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-2 py-1.5">
          <span className="text-xs text-gray-400 font-medium pl-1">Sort by</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortKey(opt.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                sortKey === opt.key ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
            className="ml-0.5 p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={sortDir === 'asc' ? 'M3 4h13M3 8h9M3 12h5m4 0l4 4 4-4m-4 4V4' : 'M3 4h13M3 8h9M3 12h9m4 8l4-4-4-4m0 8V4'} />
            </svg>
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && isSuperAdmin && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{editing ? 'Edit University' : 'Add University'}</h3>
          {error && <div className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={lbl}>University Name *</label>
                <input className={inp} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Kurukshetra University" required />
              </div>
              <div>
                <label className={lbl}>Code *</label>
                <input className={inp} value={form.code} onChange={(e) => update('code', e.target.value.toUpperCase())} placeholder="e.g. KUK" required />
              </div>
              <div>
                <label className={lbl}>City</label>
                <input className={inp} value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="e.g. Kurukshetra" />
              </div>
              <div>
                <label className={lbl}>Address</label>
                <input className={inp} value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className={lbl}>State</label>
                <input className={inp} value={form.state} onChange={(e) => update('state', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Website URL</label>
                <input className={inp} value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://www.example.ac.in" />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input type="email" className={inp} value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="info@example.ac.in" />
              </div>
              <div>
                <label className={lbl}>Phone</label>
                <input className={inp} value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="e.g. 01onal-123456" />
              </div>
              <div>
                <label className={lbl}>Logo URL</label>
                <input className={inp} value={form.logoUrl} onChange={(e) => update('logoUrl', e.target.value)} placeholder="/logos/CODE.png or https://..." />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : editing ? 'Update' : 'Add University'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 dark:border-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading && Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        {!loading && sorted.map((uni, idx) => {
          const empCount = uni._count?.employees || 0;
          const deptCount = uni._count?.departments || 0;
          const gradient = CARD_COLORS[idx % CARD_COLORS.length];
          const logo = uni.logoUrl || FALLBACK_LOGOS[uni.code];
          const website = uni.website || FALLBACK_WEBSITES[uni.code];

          return (
            <div
              key={uni.id}
              className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

              <div className="px-3.5 py-3">
                <div className="flex items-start gap-2.5 mb-2.5">
                  {logo ? (
                    <img src={logo} alt={uni.code} className="w-9 h-9 rounded-lg object-contain bg-gray-50 dark:bg-gray-800 p-0.5 border border-gray-100 dark:border-gray-700 shrink-0" />
                  ) : (
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                      <span className="text-white font-bold text-[10px]">{uni.code?.substring(0, 2)}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-tight line-clamp-2">{uni.name}</h3>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {isSuperAdmin && (
                          <button onClick={() => openEdit(uni)} title="Edit" className="p-0.5 text-gray-300 hover:text-primary-600 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {website && (
                          <a href={website} target="_blank" rel="noopener noreferrer" className="p-0.5 text-gray-300 hover:text-primary-600 transition-colors" title="Website">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                    <span className={`inline-block mt-1 px-2 py-px bg-gradient-to-r ${gradient} text-white text-[10px] rounded-full font-semibold`}>
                      {uni.code}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className={`rounded-lg px-2 py-1.5 text-center ${sortKey === 'employees' ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-800' : 'bg-gray-50 dark:bg-gray-800'}`}>
                    <p className={`text-lg font-bold leading-none ${sortKey === 'employees' ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-gray-100'}`}>{empCount}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Employees</p>
                  </div>
                  <div className={`rounded-lg px-2 py-1.5 text-center ${sortKey === 'departments' ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-800' : 'bg-gray-50 dark:bg-gray-800'}`}>
                    <p className={`text-lg font-bold leading-none ${sortKey === 'departments' ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-gray-100'}`}>{deptCount}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Departments</p>
                  </div>
                </div>

                {uni.city && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{uni.city}, {uni.state}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
