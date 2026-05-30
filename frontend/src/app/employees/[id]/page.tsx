'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Employee } from '@/lib/types';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    api.get<Employee>(`/employees/${id}`).then(setEmployee);
  }, [id]);

  if (!employee) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>;
  }

  const fields = [
    ['Employee ID', employee.employeeId],
    ['Employee Name', employee.name],
    ['Gender', employee.gender],
    ['University', employee.university?.name],
    ['Department', employee.department?.name],
    ['Subject', employee.subject],
    ['Category', employee.category],
    ['Category (Selection)', employee.categorySelection],
    ['Post Type', employee.postType],
    ['Employee Type', employee.employeeClassification?.replace('_', ' ')],
    ['Designation (Appointment)', employee.designationAppointed],
    ['Designation (Present)', employee.designationPresent],
    ['Date of Joining', employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString('en-IN') : '-'],
    ['Retirement Date', employee.retirementDate ? new Date(employee.retirementDate).toLocaleDateString('en-IN') : '-'],
    ['Employment Status', employee.employmentStatus],
    ['Mobile Number', employee.mobileNumber],
    ['Email', employee.email],
  ];

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{employee.name}</h2>
          <p className="text-gray-500">{employee.designationPresent} &middot; {employee.university?.code}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Employee Details</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {fields.map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-sm text-gray-500">{label}</dt>
              <dd className="text-sm font-medium text-gray-900 mt-0.5">{(value as string) || '-'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
