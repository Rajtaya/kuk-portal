'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Department, University } from '@/lib/types';
import { useToast } from '@/components/ui/toast';

interface MasterItem { id: string; name: string }
interface AuditEntry {
  id: string; action: string; entity: string; entityId?: string; createdAt: string;
  user: { name: string; email: string };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isUniAdmin = user?.role === 'UNIVERSITY_ADMIN';

  // --- Master data ---
  const [subjects, setSubjects] = useState<MasterItem[]>([]);
  const [designations, setDesignations] = useState<MasterItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [newDept, setNewDept] = useState('');
  const [deptUniId, setDeptUniId] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'subjects' | 'departments' | 'designations' | 'account'>('subjects');
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');

  const fetchSubjects = useCallback(() => { api.get<MasterItem[]>('/masters/subjects').then(setSubjects); }, []);
  const fetchDesignations = useCallback(() => { api.get<MasterItem[]>('/masters/designations').then(setDesignations); }, []);

  const fetchDepartments = useCallback(() => {
    const uniId = isUniAdmin ? user?.university?.id : deptUniId;
    if (uniId) {
      api.get<Department[]>(`/departments?universityId=${uniId}`).then(setDepartments);
    } else if (isSuperAdmin && !deptUniId) {
      setDepartments([]);
    }
  }, [isUniAdmin, isSuperAdmin, user, deptUniId]);

  useEffect(() => { fetchSubjects(); fetchDesignations(); }, [fetchSubjects, fetchDesignations]);
  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  useEffect(() => {
    if (isSuperAdmin) {
      api.get<University[]>('/universities').then(setUniversities);
      api.get<{ data: AuditEntry[] }>('/audit?limit=20').then((res) => setAuditLogs(res.data || []));
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isUniAdmin && user?.university?.id) setDeptUniId(user.university.id);
  }, [isUniAdmin, user]);

  // --- Handlers ---
  async function addSubject() {
    const name = newSubject.trim();
    if (!name) return;
    try {
      await api.post('/masters/subjects', { name });
      setNewSubject('');
      fetchSubjects();
      toast(`Subject "${name}" added`, 'success');
    } catch (err: any) { toast(err.message || 'Failed to add subject', 'error'); }
  }

  async function deleteSubject(id: string, name: string) {
    if (!confirm(`Delete subject "${name}"?`)) return;
    try {
      await api.delete(`/masters/subjects/${id}`);
      fetchSubjects();
      toast(`Subject "${name}" deleted`, 'success');
    } catch (err: any) { toast(err.message || 'Failed to delete', 'error'); }
  }

  function startEditSubject(s: MasterItem) {
    setEditingSubject(s.id);
    setEditSubjectName(s.name);
  }

  async function saveEditSubject(id: string) {
    const name = editSubjectName.trim();
    if (!name) return;
    try {
      await api.put(`/masters/subjects/${id}`, { name });
      setEditingSubject(null);
      fetchSubjects();
      toast('Subject updated', 'success');
    } catch (err: any) { toast(err.message || 'Failed to update', 'error'); }
  }

  function startEditDept(d: Department) {
    setEditingDept(d.id);
    setEditDeptName(d.name);
  }

  async function saveEditDept(id: string) {
    const name = editDeptName.trim();
    if (!name) return;
    try {
      await api.put(`/departments/${id}`, { name });
      setEditingDept(null);
      fetchDepartments();
      toast('Department updated', 'success');
    } catch (err: any) { toast(err.message || 'Failed to update', 'error'); }
  }

  async function addDesignation() {
    const name = newDesignation.trim();
    if (!name) return;
    try {
      await api.post('/masters/designations', { name });
      setNewDesignation('');
      fetchDesignations();
      toast(`Designation "${name}" added`, 'success');
    } catch (err: any) { toast(err.message || 'Failed to add designation', 'error'); }
  }

  async function deleteDesignation(id: string, name: string) {
    if (!confirm(`Delete designation "${name}"?`)) return;
    try {
      await api.delete(`/masters/designations/${id}`);
      fetchDesignations();
      toast(`Designation "${name}" deleted`, 'success');
    } catch (err: any) { toast(err.message || 'Failed to delete', 'error'); }
  }

  async function addDepartment() {
    const name = newDept.trim();
    const universityId = isUniAdmin ? user?.university?.id : deptUniId;
    if (!name || !universityId) return;
    try {
      await api.post('/departments', { name, universityId });
      setNewDept('');
      fetchDepartments();
      toast(`Department "${name}" added`, 'success');
    } catch (err: any) { toast(err.message || 'Failed to add department', 'error'); }
  }

  async function deleteDepartment(id: string, name: string) {
    if (!confirm(`Delete department "${name}"? This will fail if employees are assigned to it.`)) return;
    try {
      await api.delete(`/departments/${id}`);
      fetchDepartments();
      toast(`Department "${name}" deleted`, 'success');
    } catch (err: any) { toast(err.message || 'Cannot delete — department has employees', 'error'); }
  }

  const tabs = [
    { key: 'subjects' as const, label: 'Subjects', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
    { key: 'departments' as const, label: 'Departments', icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21' },
    ...(isSuperAdmin ? [{ key: 'designations' as const, label: 'Designations', icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' }] : []),
    { key: 'account' as const, label: 'Account', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ];

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        </svg>
        Settings
      </h2>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white dark:bg-gray-900 text-primary-600 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Subjects Tab ────────────────────────── */}
      {activeTab === 'subjects' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Subjects</h3>
            <span className="text-sm text-gray-400">{subjects.length} total</span>
          </div>
          {/* Add form */}
          <div className="flex gap-2 mb-5">
            <input
              className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter new subject name..."
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSubject()}
            />
            <button
              onClick={addSubject}
              disabled={!newSubject.trim()}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40 transition-colors"
            >
              Add Subject
            </button>
          </div>
          {/* List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg group">
                {editingSubject === s.id ? (
                  <div className="flex items-center gap-1.5 flex-1 mr-1">
                    <input
                      className="flex-1 px-2 py-1 border border-primary-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      value={editSubjectName}
                      onChange={(e) => setEditSubjectName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditSubject(s.id); if (e.key === 'Escape') setEditingSubject(null); }}
                      autoFocus
                    />
                    <button onClick={() => saveEditSubject(s.id)} className="text-green-600 hover:text-green-700" title="Save">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </button>
                    <button onClick={() => setEditingSubject(null)} className="text-gray-400 hover:text-gray-600" title="Cancel">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{s.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEditSubject(s)} className="p-1 rounded-md text-primary-500 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      {isSuperAdmin && (
                        <button onClick={() => deleteSubject(s.id, s.name)} className="p-1 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          {subjects.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No subjects yet. Add the first one above.</p>}
        </div>
      )}

      {/* ── Departments Tab ────────────────────── */}
      {activeTab === 'departments' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Departments</h3>
            <span className="text-sm text-gray-400">{departments.length} total</span>
          </div>
          {/* University selector for Super Admin */}
          {isSuperAdmin && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Select University</label>
              <select
                className="w-full max-w-md px-3 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={deptUniId}
                onChange={(e) => setDeptUniId(e.target.value)}
              >
                <option value="">Choose a university...</option>
                {universities.map((u) => <option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
              </select>
            </div>
          )}
          {isUniAdmin && user?.university && (
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg px-4 py-2.5 mb-4">
              <p className="text-sm text-primary-800 dark:text-primary-300">University: <span className="font-semibold">{user.university.name} ({user.university.code})</span></p>
            </div>
          )}
          {/* Add form */}
          {(deptUniId || isUniAdmin) && (
            <div className="flex gap-2 mb-5">
              <input
                className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter new department name..."
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDepartment()}
              />
              <button
                onClick={addDepartment}
                disabled={!newDept.trim()}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40 transition-colors"
              >
                Add Department
              </button>
            </div>
          )}
          {/* List */}
          {!deptUniId && isSuperAdmin && (
            <p className="text-gray-400 text-sm text-center py-8">Select a university above to manage its departments.</p>
          )}
          <div className="space-y-2">
            {departments.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg group">
                {editingDept === d.id ? (
                  <div className="flex items-center gap-1.5 flex-1 mr-1">
                    <input
                      className="flex-1 px-2 py-1 border border-primary-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      value={editDeptName}
                      onChange={(e) => setEditDeptName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditDept(d.id); if (e.key === 'Escape') setEditingDept(null); }}
                      autoFocus
                    />
                    <button onClick={() => saveEditDept(d.id)} className="text-green-600 hover:text-green-700" title="Save">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </button>
                    <button onClick={() => setEditingDept(null)} className="text-gray-400 hover:text-gray-600" title="Cancel">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.name}</span>
                      {d._count?.employees != null && (
                        <span className="text-xs text-gray-400 ml-2">({d._count.employees} employees)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEditDept(d)} className="p-1 rounded-md text-primary-500 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      {isSuperAdmin && (
                        <button onClick={() => deleteDepartment(d.id, d.name)} className="p-1 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          {departments.length === 0 && deptUniId && <p className="text-gray-400 text-sm text-center py-8">No departments for this university. Add the first one above.</p>}
        </div>
      )}

      {/* ── Designations Tab (Super Admin only) ── */}
      {activeTab === 'designations' && isSuperAdmin && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Designations</h3>
            <span className="text-sm text-gray-400">{designations.length} total</span>
          </div>
          <div className="flex gap-2 mb-5">
            <input
              className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter new designation name..."
              value={newDesignation}
              onChange={(e) => setNewDesignation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDesignation()}
            />
            <button
              onClick={addDesignation}
              disabled={!newDesignation.trim()}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40 transition-colors"
            >
              Add Designation
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {designations.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg group">
                <span className="text-sm text-gray-800 dark:text-gray-200">{d.name}</span>
                <button onClick={() => deleteDesignation(d.id, d.name)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" title="Delete">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {designations.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No designations yet. Add the first one above.</p>}
        </div>
      )}

      {/* ── Account Tab ────────────────────────── */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Account</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-900 dark:text-gray-100">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
                <dd className="font-medium">{user?.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="font-medium">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Role</dt>
                <dd className="font-medium">{user?.role?.replace('_', ' ')}</dd>
              </div>
              {user?.university && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">University</dt>
                  <dd className="font-medium">{user.university.name}</dd>
                </div>
              )}
            </dl>
          </section>

          {isSuperAdmin && (
            <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Recent Audit Logs</h3>
              {auditLogs.length === 0 ? (
                <p className="text-gray-400 text-sm">No audit logs yet</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 text-sm text-gray-900 dark:text-gray-200">
                      <div>
                        <span className="font-medium">{log.user.name}</span>
                        <span className="text-gray-400 mx-2">&middot;</span>
                        <span className="text-gray-600 dark:text-gray-400">{log.action} {log.entity}</span>
                      </div>
                      <span className="text-gray-400 text-xs">{new Date(log.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
