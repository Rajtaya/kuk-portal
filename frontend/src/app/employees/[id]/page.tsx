'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Employee, Department } from '@/lib/types';
import { useToast } from '@/components/ui/toast';

const API_BASE = '';

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  RETIRED: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  RESIGNED: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  TERMINATED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  SUSPENDED: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
};

function formatDate(d?: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// For <input type="date">. Slicing the ISO string takes the UTC date, which is
// one day behind the local date formatDate shows for stored IST-midnight values.
function toDateInputValue(d?: string | null) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function yearsOfService(d?: string | null) {
  if (!d) return null;
  const diff = Date.now() - new Date(d).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function yearsUntilRetirement(d?: string | null) {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function prettyEnum(s?: string | null) {
  if (!s) return '-';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bSfs\b/, 'SFS').replace(/\bBca\b/, 'BCA').replace(/\bBcb\b/, 'BCB').replace(/\bEws\b/, 'EWS').replace(/\bPwd\b/, 'PWD').replace(/\bDsc\b/, 'DSC').replace(/\bOsc\b/, 'OSC').replace(/\bUr\b/, 'UR');
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});

  const canEdit = user?.role === 'UNIVERSITY_ADMIN';
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast('Only JPEG, PNG, or WebP images are allowed', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Photo must be under 5 MB', 'error');
      return;
    }
    setUploading(true);
    try {
      const updated = await api.uploadFile<Employee>(`/employees/${id}/photo`, file, undefined, 'photo');
      setEmployee(updated);
      toast('Photo uploaded successfully', 'success');
    } catch {
      toast('Failed to upload photo', 'error');
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  useEffect(() => {
    api.get<Employee>(`/employees/${id}`).then((emp) => {
      setEmployee(emp);
      setForm({
        name: emp.name || '',
        gender: emp.gender || 'MALE',
        subject: emp.subject || '',
        category: emp.category || 'UR',
        categorySelection: emp.categorySelection || 'UR',
        postType: emp.postType || 'BUDGETED',
        employeeClassification: emp.employeeClassification || 'TEACHING',
        designationAppointed: emp.designationAppointed || '',
        designationPresent: emp.designationPresent || '',
        dateOfJoining: toDateInputValue(emp.dateOfJoining),
        retirementDate: toDateInputValue(emp.retirementDate),
        employmentStatus: emp.employmentStatus || 'ACTIVE',
        mobileNumber: emp.mobileNumber || '',
        email: emp.email || '',
        departmentId: emp.departmentId || '',
      });
    });
  }, [id]);

  useEffect(() => {
    if (employee?.universityId) {
      api.get<Department[]>(`/departments?universityId=${employee.universityId}`).then(setDepartments);
    }
  }, [employee?.universityId]);

  useEffect(() => {
    api.get<{ id: string; name: string }[]>('/masters/subjects').then(setSubjects);
  }, []);

  const summary = useMemo(() => {
    if (!employee) return null;
    const yos = yearsOfService(employee.dateOfJoining);
    const ytr = yearsUntilRetirement(employee.retirementDate);
    return { yos, ytr };
  }, [employee]);

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, any> = { ...form };
      if (!payload.dateOfJoining) delete payload.dateOfJoining;
      if (!payload.retirementDate) delete payload.retirementDate;
      const updated = await api.put<Employee>(`/employees/${id}`, payload);
      setEmployee(updated);
      setEditing(false);
      toast('Profile updated successfully', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (!employee) return;
    setForm({
      name: employee.name || '',
      gender: employee.gender || 'MALE',
      subject: employee.subject || '',
      category: employee.category || 'UR',
      categorySelection: employee.categorySelection || 'UR',
      postType: employee.postType || 'BUDGETED',
      employeeClassification: employee.employeeClassification || 'TEACHING',
      designationAppointed: employee.designationAppointed || '',
      designationPresent: employee.designationPresent || '',
      dateOfJoining: toDateInputValue(employee.dateOfJoining),
      retirementDate: toDateInputValue(employee.retirementDate),
      employmentStatus: employee.employmentStatus || 'ACTIVE',
      mobileNumber: employee.mobileNumber || '',
      email: employee.email || '',
      departmentId: employee.departmentId || '',
    });
    setEditing(false);
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  const sc = STATUS_COLOR[employee.employmentStatus] || STATUS_COLOR.ACTIVE;
  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1';

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/employees')}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Employee Profile</h1>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              Edit Profile
            </button>
          )}
          {editing && (
            <>
              <button onClick={handleCancel} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* LEFT — Identity Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="relative group">
              {employee.photoUrl ? (
                <img
                  src={`${API_BASE}${employee.photoUrl}`}
                  alt={employee.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg shadow-primary-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary-200">
                  {getInitials(employee.name)}
                </div>
              )}
              {canEdit && (
                <>
                  <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-700 transition-colors border-2 border-white"
                    title="Upload Photo"
                  >
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                      </svg>
                    )}
                  </button>
                </>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-3">{employee.name}</h2>
            <span className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
              <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
              {prettyEnum(employee.employmentStatus)}
            </span>
          </div>

          <div className="space-y-4 border-t border-gray-100 pt-5">
            <InfoRow icon={<DesigIcon />} label="Designation" value={employee.designationPresent || '-'} />
            <InfoRow icon={<DeptIcon />} label="Department" value={employee.department?.name || employee.subject || '-'} />
            <InfoRow icon={<UniIcon />} label="University" value={`${employee.university?.name || '-'}, ${employee.university?.city || ''}`} />
            <InfoRow icon={<IdIcon />} label="Employee No." value={employee.employeeId || '-'} />
            <InfoRow icon={<CalIcon />} label="Date of Joining" value={formatDate(employee.dateOfJoining)} />
          </div>
        </div>

        {/* MIDDLE — Personal + Employment Details */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="flex items-center gap-2 text-base font-bold text-primary-600 mb-5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Personal Details
          </h3>
          {!editing ? (
            <div className="space-y-4">
              <DetailRow icon={<PhoneIcon />} label="Mobile Number" value={employee.mobileNumber || '-'} />
              <DetailRow icon={<EmailIcon />} label="Email Address" value={employee.email || '-'} />
              <DetailRow icon={<GenderIcon />} label="Gender" value={prettyEnum(employee.gender)} />
              <DetailRow icon={<CatIcon />} label="Category" value={prettyEnum(employee.category)} />
              <DetailRow icon={<CatIcon />} label="Selection Category" value={prettyEnum(employee.categorySelection)} />
              <DetailRow icon={<PostIcon />} label="Post Type" value={employee.postType === 'SFS' ? 'Self Financed' : prettyEnum(employee.postType)} />
            </div>
          ) : (
            <div className="space-y-3">
              <div><label className={lbl}>Mobile Number</label><input className={inp} value={form.mobileNumber} onChange={(e) => update('mobileNumber', e.target.value)} /></div>
              <div><label className={lbl}>Email</label><input className={inp} type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></div>
              <div><label className={lbl}>Gender</label>
                <select className={inp} value={form.gender} onChange={(e) => update('gender', e.target.value)}>
                  <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                </select>
              </div>
              <div><label className={lbl}>Category</label>
                <select className={inp} value={form.category} onChange={(e) => update('category', e.target.value)}>
                  {['UR','DSC','OSC','BCA','BCB','EWS','PWD'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Selection Category</label>
                <select className={inp} value={form.categorySelection} onChange={(e) => update('categorySelection', e.target.value)}>
                  {['UR','DSC','OSC','BCA','BCB','EWS','PWD'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Post Type</label>
                <select className={inp} value={form.postType} onChange={(e) => update('postType', e.target.value)}>
                  <option value="BUDGETED">Budgeted</option><option value="SFS">Self Financed</option><option value="CONTRACTUAL">Contractual</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Employment Details */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="flex items-center gap-2 text-base font-bold text-primary-600 mb-5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Employment Details
          </h3>
          {!editing ? (
            <div className="space-y-4">
              <DetailRow icon={<DesigIcon />} label="Designation (Appointed)" value={employee.designationAppointed || '-'} />
              <DetailRow icon={<DesigIcon />} label="Designation (Present)" value={employee.designationPresent || '-'} />
              <DetailRow icon={<ClassIcon />} label="Classification" value={prettyEnum(employee.employeeClassification)} />
              <DetailRow icon={<SubjIcon />} label="Subject" value={employee.subject || '-'} />
              <DetailRow icon={<DeptIcon />} label="Department" value={employee.department?.name || '-'} />
              <DetailRow icon={<CalIcon />} label="Date of Joining" value={formatDate(employee.dateOfJoining)} />
              <DetailRow icon={<CalIcon />} label="Retirement Date" value={formatDate(employee.retirementDate)} />
            </div>
          ) : (
            <div className="space-y-3">
              <div><label className={lbl}>Employee Name</label><input className={inp} value={form.name} onChange={(e) => update('name', e.target.value)} required /></div>
              <div><label className={lbl}>Designation (Appointed)</label>
                <select className={inp} value={form.designationAppointed} onChange={(e) => update('designationAppointed', e.target.value)}>
                  <option value="">Select</option>
                  <option value="Professor">Professor</option><option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option><option value="Senior Professor">Senior Professor</option>
                </select>
              </div>
              <div><label className={lbl}>Designation (Present)</label>
                <select className={inp} value={form.designationPresent} onChange={(e) => update('designationPresent', e.target.value)}>
                  <option value="">Select</option>
                  <option value="Professor">Professor</option><option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option><option value="Senior Professor">Senior Professor</option>
                </select>
              </div>
              <div><label className={lbl}>Subject</label>
                <select className={inp} value={form.subject} onChange={(e) => update('subject', e.target.value)}>
                  <option value="">Select Subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Department</label>
                <select className={inp} value={form.departmentId} onChange={(e) => update('departmentId', e.target.value)}>
                  <option value="">Select</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Date of Joining</label><input className={inp} type="date" value={form.dateOfJoining} onChange={(e) => update('dateOfJoining', e.target.value)} /></div>
              <div><label className={lbl}>Retirement Date</label><input className={inp} type="date" value={form.retirementDate} onChange={(e) => update('retirementDate', e.target.value)} /></div>
              <div><label className={lbl}>Employment Status</label>
                <select className={inp} value={form.employmentStatus} onChange={(e) => update('employmentStatus', e.target.value)}>
                  <option value="ACTIVE">Active</option><option value="RETIRED">Retired</option>
                  <option value="RESIGNED">Resigned</option><option value="TERMINATED">Terminated</option><option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <SummaryCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>}
          label="Years of Service"
          value={summary?.yos != null ? `${summary.yos} Years` : '-'}
          sub={employee.dateOfJoining ? `Since ${formatDate(employee.dateOfJoining)}` : ''}
          color="blue"
        />
        <SummaryCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Retirement In"
          value={summary?.ytr != null ? (summary.ytr === 0 ? 'Retired' : `${summary.ytr} Years`) : '-'}
          sub={employee.retirementDate ? formatDate(employee.retirementDate) : ''}
          color="amber"
        />
        <SummaryCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>}
          label="Post Type"
          value={employee.postType === 'SFS' ? 'Self Financed' : prettyEnum(employee.postType)}
          sub={prettyEnum(employee.employeeClassification)}
          color="purple"
        />
        <SummaryCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Current Status"
          value={prettyEnum(employee.employmentStatus)}
          sub="Employment Status"
          color={employee.employmentStatus === 'ACTIVE' ? 'green' : 'red'}
        />
      </div>
    </div>
  );
}

/* ── Subcomponents ──────────────────────────────── */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-500 flex-shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-800 break-words">{value}</p>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">{icon}</div>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm text-gray-500 whitespace-nowrap">{label}</span>
        <span className="text-gray-300">:</span>
        <span className="text-sm font-medium text-gray-800 truncate">{value}</span>
      </div>
    </div>
  );
}

const SUMMARY_COLORS: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'bg-primary-50', icon: 'text-primary-500' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-500' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-500' },
  green: { bg: 'bg-green-50', icon: 'text-green-500' },
  red: { bg: 'bg-red-50', icon: 'text-red-500' },
};

function SummaryCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  const c = SUMMARY_COLORS[color] || SUMMARY_COLORS.blue;
  return (
    <div className={`${c.bg} rounded-2xl p-4 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center ${c.icon} flex-shrink-0 shadow-sm`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Icons ──────────────────────────────────────── */

const s = 'w-4 h-4';
function DesigIcon() { return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>; }
function DeptIcon() { return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>; }
function UniIcon() { return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>; }
function IdIcon() { return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>; }
function CalIcon() { return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>; }
function PhoneIcon() { return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>; }
function EmailIcon() { return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>; }
function GenderIcon() { return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>; }
function CatIcon() { return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>; }
function PostIcon() { return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>; }
function SubjIcon() { return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>; }
function ClassIcon() { return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg>; }
