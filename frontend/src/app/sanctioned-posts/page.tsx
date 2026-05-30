'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Department, University } from '@/lib/types';

interface SanctionedPost {
  id: string;
  universityId: string;
  departmentId: string;
  subject?: string;
  designation: string;
  category: string;
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
  category: string;
  sanctioned: number;
  filled: number;
  vacant: number;
}

const categories = ['GENERAL','SC','ST','OBC','EWS','BCA','BCB','PWD','ESM'];
const designations = ['Professor','Associate Professor','Assistant Professor','Other Teaching Posts'];

export default function SanctionedPostsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isStateUser = user?.role === 'STATE_USER';
  const canWrite = !isStateUser;

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

  const fixedUniversityId = !isSuperAdmin ? user?.university?.id || '' : '';

  const [form, setForm] = useState({
    universityId: '', departmentId: '', subject: '',
    designation: 'Professor', category: 'GENERAL', sanctionedCount: 0,
  });

  useEffect(() => {
    loadData();
    if (isSuperAdmin) api.get<University[]>('/universities').then(setUniversities);
  }, []);

  useEffect(() => {
    const uniId = fixedUniversityId || form.universityId;
    if (uniId) api.get<Department[]>(`/departments?universityId=${uniId}`).then(setDepartments);
  }, [fixedUniversityId, form.universityId]);

  function loadData() {
    setLoading(true);
    Promise.all([
      api.get<SanctionedPost[]>('/sanctioned-posts'),
      api.get<VacancyRow[]>('/sanctioned-posts/vacancy-report'),
    ]).then(([p, v]) => { setPosts(p); setVacancyData(v); }).finally(() => setLoading(false));
  }

  function openCreate() {
    setEditing(null);
    setForm({ universityId: fixedUniversityId, departmentId: '', subject: '', designation: 'Professor', category: 'GENERAL', sanctionedCount: 0 });
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
      category: p.category,
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
      loadData();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await api.delete(`/sanctioned-posts/${id}`);
    loadData();
  }

  function update(key: string, value: string | number) { setForm((prev) => ({ ...prev, [key]: value })); }

  const totals = vacancyData.reduce(
    (acc, r) => ({ sanctioned: acc.sanctioned + r.sanctioned, filled: acc.filled + r.filled, vacant: acc.vacant + r.vacant }),
    { sanctioned: 0, filled: 0, vacant: 0 },
  );

  function exportCSV() {
    if (!vacancyData.length) return;
    const headers = ['University','Department','Subject','Designation','Category','Sanctioned','Filled','Vacant'];
    const rows = vacancyData.map((r) => [r.university,r.department,r.subject||'',r.designation,r.category,r.sanctioned,r.filled,r.vacant].join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vacancy-report.csv'; a.click();
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
  const lbl = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sanctioned Posts</h2>
          <p className="text-gray-500 mt-1">
            {user?.role === 'UNIVERSITY_ADMIN' ? `Manage posts for ${user?.university?.name}` : 'Post management & vacancy analysis'}
          </p>
        </div>
        <div className="flex gap-3">
          {canWrite && tab === 'manage' && (
            <button onClick={openCreate} className="px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
              Add Post
            </button>
          )}
          {tab === 'vacancy' && (
            <button onClick={exportCSV} disabled={!vacancyData.length} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {canWrite && (
          <button onClick={() => setTab('manage')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'manage' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Manage Posts
          </button>
        )}
        <button onClick={() => setTab('vacancy')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'vacancy' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Vacancy Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-orange-700">{totals.sanctioned}</p>
          <p className="text-sm text-orange-600">Sanctioned</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-700">{totals.filled}</p>
          <p className="text-sm text-green-600">Filled</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-700">{totals.vacant}</p>
          <p className="text-sm text-red-600">Vacant</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{editing ? 'Edit Sanctioned Post' : 'Add Sanctioned Post'}</h3>
          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

          {!isSuperAdmin && user?.university && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-2.5 mb-4">
              <p className="text-sm text-primary-800">University: <span className="font-semibold">{user.university.name} ({user.university.code})</span></p>
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
                <label className={lbl}>Category *</label>
                <select className={inp} value={form.category} onChange={(e) => update('category', e.target.value)}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
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
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Manage Tab */}
      {tab === 'manage' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {(isSuperAdmin ? ['University'] : []).concat(['Department','Subject','Designation','Category','Sanctioned Posts','Actions']).map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {posts.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">No sanctioned posts. Click &quot;Add Post&quot; to create one.</td></tr>
                  ) : (
                    posts.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                        {isSuperAdmin && <td className="px-4 py-3">{p.university?.code}</td>}
                        <td className="px-4 py-3">{p.department?.name}</td>
                        <td className="px-4 py-3">{p.subject || '-'}</td>
                        <td className="px-4 py-3">{p.designation}</td>
                        <td className="px-4 py-3">{p.category}</td>
                        <td className="px-4 py-3 font-bold text-primary-700">{p.sanctionedCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(p)} className="text-xs text-primary-700 hover:underline">Edit</button>
                            <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vacancy Tab */}
      {tab === 'vacancy' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['University','Department','Subject','Designation','Category','Sanctioned','Filled','Vacant'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vacancyData.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">No vacancy data</td></tr>
                  ) : (
                    vacancyData.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">{row.universityCode}</td>
                        <td className="px-4 py-3">{row.department}</td>
                        <td className="px-4 py-3">{row.subject || '-'}</td>
                        <td className="px-4 py-3">{row.designation}</td>
                        <td className="px-4 py-3">{row.category}</td>
                        <td className="px-4 py-3 font-medium">{row.sanctioned}</td>
                        <td className="px-4 py-3 font-medium text-green-700">{row.filled}</td>
                        <td className="px-4 py-3 font-medium text-red-700">{row.vacant}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
