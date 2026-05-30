'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type ReportKey = string;

interface ReportDef {
  key: ReportKey;
  label: string;
  description: string;
  stateOnly?: boolean;
}

const stateReports: ReportDef[] = [
  { key: 'university-wise', label: 'University-wise Employee Report', description: 'Employee count by university with type and gender breakdown', stateOnly: true },
  { key: 'employee-strength', label: 'Employee Strength Report', description: 'Sanctioned posts, filled posts, and vacancies per university', stateOnly: true },
];

const commonReports: ReportDef[] = [
  { key: 'department-wise', label: 'Department-wise Report', description: 'Employee distribution across departments' },
  { key: 'subject-wise', label: 'Subject-wise Report', description: 'Employee count grouped by subject' },
  { key: 'designation-wise', label: 'Designation-wise Report', description: 'Employee distribution by designation' },
  { key: 'category-wise', label: 'Category-wise Report', description: 'Employee count by reservation category' },
  { key: 'gender-wise', label: 'Gender-wise Report', description: 'Gender distribution with classification breakdown' },
  { key: 'teaching-staff', label: 'Teaching Staff Report', description: 'All active teaching employees' },
  { key: 'retirement-due', label: 'Retirement Due Report', description: 'Employees retiring within next 12 months' },
  { key: 'employee-directory', label: 'Employee Directory', description: 'Contact directory of active employees' },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const isSuperOrState = user?.role === 'SUPER_ADMIN' || user?.role === 'STATE_USER';
  const allReports = [...(isSuperOrState ? stateReports : []), ...commonReports];

  async function loadReport(key: ReportKey) {
    setLoading(true);
    setActiveReport(key);
    try {
      const data = await api.get<any[]>(`/reports/${key}`);
      setReportData(Array.isArray(data) ? data : []);
    } catch {
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!reportData.length) return;
    const headers = Object.keys(reportData[0]);
    const csv = [headers.join(','), ...reportData.map((row) => headers.map((h) => {
      const val = row[h];
      if (val instanceof Object) return JSON.stringify(val);
      return JSON.stringify(val ?? '');
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeReport}-report.csv`;
    a.click();
  }

  function flattenRow(row: any): Record<string, any> {
    const flat: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
        for (const [sk, sv] of Object.entries(v as Record<string, any>)) {
          flat[`${k}.${sk}`] = sv;
        }
      } else {
        flat[k] = v;
      }
    }
    return flat;
  }

  const flatData = reportData.map(flattenRow);
  const columns = flatData.length > 0 ? Object.keys(flatData[0]).filter((k) => !k.endsWith('Id') && k !== 'id' && k !== 'documents') : [];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {allReports.map((report) => (
          <button
            key={report.key}
            onClick={() => loadReport(report.key)}
            className={`text-left p-4 rounded-xl border transition-all ${
              activeReport === report.key
                ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <h3 className="font-semibold text-gray-900 text-sm">{report.label}</h3>
            <p className="text-xs text-gray-500 mt-1">{report.description}</p>
          </button>
        ))}
      </div>

      {activeReport && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold">{allReports.find((r) => r.key === activeReport)?.label}</h3>
            <button onClick={exportCSV} disabled={!reportData.length} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
              Export CSV
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading report...</div>
          ) : flatData.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {columns.map((key) => (
                      <th key={key} className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).replace(/\./g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flatData.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      {columns.map((k) => {
                        let val = row[k];
                        if (val && typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                          val = new Date(val).toLocaleDateString('en-IN');
                        }
                        return <td key={k} className="px-4 py-3 whitespace-nowrap">{String(val ?? '-')}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
