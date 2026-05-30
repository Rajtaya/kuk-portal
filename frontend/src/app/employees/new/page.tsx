'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { University, Department } from '@/lib/types';

export default function NewEmployeePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [universities, setUniversities] = useState<University[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const fixedUniversityId = !isSuperAdmin ? user?.university?.id || '' : '';

  const [form, setForm] = useState({
    employeeId: '', name: '', gender: 'MALE',
    universityId: '', departmentId: '', subject: '',
    category: 'GENERAL', categorySelection: 'GENERAL',
    postType: 'BUDGETED', employeeClassification: 'TEACHING',
    designationAppointed: '', designationPresent: '',
    dateOfJoining: '', retirementDate: '',
    employmentStatus: 'ACTIVE',
    mobileNumber: '', email: '',
  });

  useEffect(() => {
    if (fixedUniversityId) setForm((prev) => ({ ...prev, universityId: fixedUniversityId }));
  }, [fixedUniversityId]);

  useEffect(() => {
    if (isSuperAdmin) api.get<University[]>('/universities').then(setUniversities);
  }, [isSuperAdmin]);

  useEffect(() => {
    if (form.universityId) api.get<Department[]>(`/departments?universityId=${form.universityId}`).then(setDepartments);
  }, [form.universityId]);

  function update(key: string, value: string) { setForm((prev) => ({ ...prev, [key]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/employees', form);
      router.push('/employees');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
  const lbl = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Employee</h2>
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isSuperAdmin && user?.university && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-2.5">
            <p className="text-sm text-primary-800">University: <span className="font-semibold">{user.university.name} ({user.university.code})</span></p>
          </div>
        )}

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={lbl}>Employee ID</label><input className={inp} value={form.employeeId} onChange={(e) => update('employeeId', e.target.value)} /></div>
            <div><label className={lbl}>Employee Name *</label><input className={inp} value={form.name} onChange={(e) => update('name', e.target.value)} required /></div>
            <div><label className={lbl}>Gender *</label>
              <select className={inp} value={form.gender} onChange={(e) => update('gender', e.target.value)}>
                <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
              </select>
            </div>
            <div><label className={lbl}>Mobile Number</label><input className={inp} value={form.mobileNumber} onChange={(e) => update('mobileNumber', e.target.value)} /></div>
            <div><label className={lbl}>Email Address</label><input type="email" className={inp} value={form.email} onChange={(e) => update('email', e.target.value)} /></div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Employment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isSuperAdmin && (
              <div><label className={lbl}>University *</label>
                <select className={inp} value={form.universityId} onChange={(e) => update('universityId', e.target.value)} required>
                  <option value="">Select University</option>
                  {universities.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                </select>
              </div>
            )}
            <div><label className={lbl}>Department *</label>
              <select className={inp} value={form.departmentId} onChange={(e) => update('departmentId', e.target.value)} required>
                <option value="">Select Department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Subject</label><input className={inp} value={form.subject} onChange={(e) => update('subject', e.target.value)} /></div>
            <div><label className={lbl}>Designation (Appointment)</label><input className={inp} value={form.designationAppointed} onChange={(e) => update('designationAppointed', e.target.value)} /></div>
            <div><label className={lbl}>Designation (Present)</label><input className={inp} value={form.designationPresent} onChange={(e) => update('designationPresent', e.target.value)} /></div>
            <div><label className={lbl}>Employee Type</label>
              <select className={inp} value={form.employeeClassification} onChange={(e) => update('employeeClassification', e.target.value)}>
                <option value="TEACHING">Teaching</option><option value="NON_TEACHING">Non-Teaching</option>
              </select>
            </div>
            <div><label className={lbl}>Post Type</label>
              <select className={inp} value={form.postType} onChange={(e) => update('postType', e.target.value)}>
                <option value="BUDGETED">Budgeted</option><option value="SFS">SFS</option><option value="CONTRACTUAL">Contractual</option>
              </select>
            </div>
            <div><label className={lbl}>Category</label>
              <select className={inp} value={form.category} onChange={(e) => update('category', e.target.value)}>
                {['GENERAL','SC','ST','OBC','EWS','BCA','BCB','PWD','ESM'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Category (Selection)</label>
              <select className={inp} value={form.categorySelection} onChange={(e) => update('categorySelection', e.target.value)}>
                {['GENERAL','SC','ST','OBC','EWS','BCA','BCB','PWD','ESM'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Employment Status</label>
              <select className={inp} value={form.employmentStatus} onChange={(e) => update('employmentStatus', e.target.value)}>
                <option value="ACTIVE">Active</option><option value="RETIRED">Retired</option><option value="RESIGNED">Resigned</option><option value="TERMINATED">Terminated</option>
              </select>
            </div>
            <div><label className={lbl}>Date of Joining</label><input type="date" className={inp} value={form.dateOfJoining} onChange={(e) => update('dateOfJoining', e.target.value)} /></div>
            <div><label className={lbl}>Retirement Date</label><input type="date" className={inp} value={form.retirementDate} onChange={(e) => update('retirementDate', e.target.value)} /></div>
          </div>
        </section>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {loading ? 'Saving...' : 'Save Employee'}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}
