'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Employee, University, PaginatedResponse } from '@/lib/types';

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedResponse<Employee>>({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [universities, setUniversities] = useState<University[]>([]);

  const canWrite = user?.role !== 'STATE_USER';

  useEffect(() => {
    if (user?.role !== 'UNIVERSITY_ADMIN') {
      api.get<University[]>('/universities').then(setUniversities);
    }
  }, [user]);

  const fetchEmployees = useCallback((page: number = 1, extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: '20', ...extra });
    api.get<PaginatedResponse<Employee>>(`/employees?${params}`).then(setData);
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleSearch = () => {
    const f = { ...filters, ...(search ? { search } : {}) };
    setFilters(f);
    fetchEmployees(1, f);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete employee "${name}"?`)) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees(data.page, filters);
    } catch { /* ignore */ }
  };

  const handleExport = () => {
    const rows = data.data.map((e, i) => ({
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
    const header = Object.keys(rows[0] || {}).join(',');
    const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'employees.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <span>Home</span><span>&gt;</span><span className="text-gray-800 font-medium">Employees UI</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          Employees
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
              className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:border-blue-500"
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
            <Link href="/employees/upload" className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload Excel
            </Link>
          )}
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-4 py-3 text-left font-semibold">Sr.No.</th>
                <th className="px-4 py-3 text-left font-semibold">University Name</th>
                <th className="px-4 py-3 text-left font-semibold">University Code</th>
                <th className="px-4 py-3 text-left font-semibold">Employee Name</th>
                <th className="px-4 py-3 text-left font-semibold">Subject</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Selection Category</th>
                <th className="px-4 py-3 text-left font-semibold">Designation</th>
                <th className="px-4 py-3 text-left font-semibold">Present Designation</th>
                <th className="px-4 py-3 text-left font-semibold">Gender</th>
                <th className="px-4 py-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.data.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400">No records found</td>
                </tr>
              ) : (
                data.data.map((emp, i) => (
                  <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600">{i + 1 + (data.page - 1) * 20}</td>
                    <td className="px-4 py-3">{emp.university?.name || '-'}</td>
                    <td className="px-4 py-3">{emp.university?.code || '-'}</td>
                    <td className="px-4 py-3 font-medium">{emp.name}</td>
                    <td className="px-4 py-3">{emp.subject || '-'}</td>
                    <td className="px-4 py-3">{emp.category}</td>
                    <td className="px-4 py-3">{emp.categorySelection}</td>
                    <td className="px-4 py-3">{emp.designationAppointed || '-'}</td>
                    <td className="px-4 py-3">{emp.designationPresent || '-'}</td>
                    <td className="px-4 py-3">{emp.gender}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {/* View */}
                        <button
                          onClick={() => router.push(`/employees/${emp.id}`)}
                          className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing {data.data.length} of {data.total} records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchEmployees(data.page - 1, filters)}
              disabled={data.page <= 1}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">Page {data.page} of {data.totalPages}</span>
            <button
              onClick={() => fetchEmployees(data.page + 1, filters)}
              disabled={data.page >= data.totalPages}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
