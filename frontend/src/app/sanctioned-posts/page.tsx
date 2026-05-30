'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

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

export default function SanctionedPostsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<VacancyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<VacancyRow[]>('/sanctioned-posts/vacancy-report')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const totals = data.reduce(
    (acc, r) => ({ sanctioned: acc.sanctioned + r.sanctioned, filled: acc.filled + r.filled, vacant: acc.vacant + r.vacant }),
    { sanctioned: 0, filled: 0, vacant: 0 },
  );

  function exportCSV() {
    if (!data.length) return;
    const headers = ['University', 'Department', 'Subject', 'Designation', 'Category', 'Sanctioned', 'Filled', 'Vacant'];
    const rows = data.map((r) => [r.university, r.department, r.subject || '', r.designation, r.category, r.sanctioned, r.filled, r.vacant].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vacancy-report.csv';
    a.click();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sanctioned Posts &amp; Vacancies</h2>
          <p className="text-gray-500 mt-1">Sanctioned vs filled positions</p>
        </div>
        <button onClick={exportCSV} disabled={!data.length} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
          Export CSV
        </button>
      </div>

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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['University', 'Department', 'Subject', 'Designation', 'Category', 'Sanctioned', 'Filled', 'Vacant'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">No sanctioned posts configured</td></tr>
                ) : (
                  data.map((row) => (
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
    </div>
  );
}
