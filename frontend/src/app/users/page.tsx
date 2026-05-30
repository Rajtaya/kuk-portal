'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { University } from '@/lib/types';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  university?: { id: string; name: string; code: string } | null;
  createdAt: string;
}

const roles = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'STATE_USER', label: 'State User' },
  { value: 'UNIVERSITY_ADMIN', label: 'University Admin' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'UNIVERSITY_ADMIN', universityId: '',
  });

  useEffect(() => {
    loadUsers();
    api.get<University[]>('/universities').then(setUniversities);
  }, []);

  function loadUsers() {
    api.get<UserRecord[]>('/users').then(setUsers);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'UNIVERSITY_ADMIN', universityId: '' });
    setShowForm(true);
    setError('');
  }

  function openEdit(u: UserRecord) {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      universityId: u.university?.id || '',
    });
    setShowForm(true);
    setError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload: any = { name: form.name, email: form.email, role: form.role };
      if (form.role === 'UNIVERSITY_ADMIN' && form.universityId) {
        payload.universityId = form.universityId;
      } else {
        payload.universityId = null;
      }

      if (editing) {
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing.id}`, payload);
      } else {
        payload.password = form.password;
        await api.post('/users', payload);
      }

      setShowForm(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string) {
    await api.patch(`/users/${id}/toggle-active`);
    loadUsers();
  }

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
  const lbl = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-500 mt-1">{users.length} users</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
          Add User
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{editing ? 'Edit User' : 'Create User'}</h3>
          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={lbl}>Full Name *</label>
                <input className={inp} value={form.name} onChange={(e) => update('name', e.target.value)} required />
              </div>
              <div>
                <label className={lbl}>Email *</label>
                <input type="email" className={inp} value={form.email} onChange={(e) => update('email', e.target.value)} required />
              </div>
              <div>
                <label className={lbl}>{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input type="password" className={inp} value={form.password} onChange={(e) => update('password', e.target.value)} required={!editing} minLength={6} />
              </div>
              <div>
                <label className={lbl}>Role *</label>
                <select className={inp} value={form.role} onChange={(e) => update('role', e.target.value)}>
                  {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {form.role === 'UNIVERSITY_ADMIN' && (
                <div>
                  <label className={lbl}>University *</label>
                  <select className={inp} value={form.universityId} onChange={(e) => update('universityId', e.target.value)} required>
                    <option value="">Select University</option>
                    {universities.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : editing ? 'Update User' : 'Create User'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">University</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    u.role === 'SUPER_ADMIN' ? 'bg-red-50 text-red-700' :
                    u.role === 'STATE_USER' ? 'bg-blue-50 text-blue-700' :
                    'bg-orange-50 text-orange-700'
                  }`}>
                    {u.role.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">{u.university ? `${u.university.name} (${u.university.code})` : '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="text-xs text-primary-700 hover:underline">Edit</button>
                    <button onClick={() => toggleActive(u.id)} className={`text-xs ${u.isActive ? 'text-red-600' : 'text-green-600'} hover:underline`}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
