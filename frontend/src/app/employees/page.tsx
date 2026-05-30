'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Employee, University, PaginatedResponse } from '@/lib/types';
import DataTable from '@/components/ui/data-table';
import FilterBar from '@/components/ui/filter-bar';

const employeeColumns = [
  { key: 'employeeId', label: 'Emp ID' },
  { key: 'name', label: 'Name' },
  { key: 'university', label: 'University', render: (row: Employee) => row.university?.code || '-' },
  { key: 'department', label: 'Department', render: (row: Employee) => row.department?.name || '-' },
  { key: 'subject', label: 'Subject' },
  { key: 'designationPresent', label: 'Designation' },
  { key: 'employeeClassification', label: 'Emp Type', render: (row: Employee) => (
    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">{row.employeeClassification?.replace('_', ' ')}</span>
  )},
  { key: 'postType', label: 'Post Type', render: (row: Employee) => (
    <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full">{row.postType}</span>
  )},
  { key: 'category', label: 'Category' },
  { key: 'gender', label: 'Gender' },
  { key: 'employmentStatus', label: 'Status', render: (row: Employee) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-50 text-green-700', RETIRED: 'bg-gray-100 text-gray-600',
      RESIGNED: 'bg-yellow-50 text-yellow-700', TERMINATED: 'bg-red-50 text-red-700',
      SUSPENDED: 'bg-red-50 text-red-600',
    };
    return <span className={`px-2 py-0.5 text-xs rounded-full ${colors[row.employmentStatus]}`}>{row.employmentStatus}</span>;
  }},
  { key: 'retirementDate', label: 'Retirement', render: (row: Employee) =>
    row.retirementDate ? new Date(row.retirementDate).toLocaleDateString('en-IN') : '-',
  },
];

const staticFilters = [
  { key: 'postType', label: 'Post Type', options: [
    { value: 'BUDGETED', label: 'Budgeted' }, { value: 'SFS', label: 'SFS' }, { value: 'CONTRACTUAL', label: 'Contractual' },
  ]},
  { key: 'employeeClassification', label: 'Emp Type', options: [
    { value: 'TEACHING', label: 'Teaching' },
  ]},
  { key: 'employmentStatus', label: 'Status', options: [
    { value: 'ACTIVE', label: 'Active' }, { value: 'RETIRED', label: 'Retired' },
    { value: 'RESIGNED', label: 'Resigned' }, { value: 'TERMINATED', label: 'Terminated' },
  ]},
  { key: 'gender', label: 'Gender', options: [
    { value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' },
  ]},
  { key: 'category', label: 'Category', options: [
    { value: 'GENERAL', label: 'General' }, { value: 'SC', label: 'SC' }, { value: 'ST', label: 'ST' },
    { value: 'OBC', label: 'OBC' }, { value: 'EWS', label: 'EWS' }, { value: 'BCA', label: 'BCA' },
    { value: 'BCB', label: 'BCB' }, { value: 'PWD', label: 'PwD' }, { value: 'ESM', label: 'ESM' },
  ]},
];

export default function EmployeesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedResponse<Employee>>({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [universities, setUniversities] = useState<University[]>([]);

  const canWrite = user?.role !== 'STATE_USER';

  useEffect(() => {
    if (user?.role !== 'UNIVERSITY_ADMIN') {
      api.get<University[]>('/universities').then(setUniversities);
    }
  }, [user]);

  const filterOptions = [
    ...(user?.role !== 'UNIVERSITY_ADMIN' ? [{
      key: 'universityId', label: 'University',
      options: universities.map((u) => ({ value: u.id, label: `${u.name} (${u.code})` })),
    }] : []),
    ...staticFilters,
  ];

  const fetchEmployees = useCallback((page: number = 1, extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: '20', ...extra });
    api.get<PaginatedResponse<Employee>>(`/employees?${params}`).then(setData);
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employees</h2>
          <p className="text-gray-500 mt-1">{data.total} total records</p>
        </div>
        {canWrite && (
          <div className="flex gap-3">
            <Link href="/employees/upload" className="px-4 py-2.5 border border-primary-600 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors">
              Upload Data
            </Link>
            <Link href="/employees/new" className="px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
              Add Employee
            </Link>
          </div>
        )}
      </div>

      <div className="mb-4">
        <FilterBar
          filters={filterOptions}
          searchPlaceholder="Search by name, ID, mobile, email..."
          onFilter={(f) => { setFilters(f); fetchEmployees(1, f); }}
        />
      </div>

      <DataTable
        columns={employeeColumns}
        data={data.data}
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        onPageChange={(p) => fetchEmployees(p, filters)}
        onRowClick={(row) => router.push(`/employees/${row.id}`)}
      />
    </div>
  );
}
