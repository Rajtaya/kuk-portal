'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type ReportKey = string;

interface ReportDef {
  key: ReportKey;
  label: string;
  description: string;
  icon: string;
  color: string;
  stateOnly?: boolean;
}

const stateReports: ReportDef[] = [
  { key: 'university-wise', label: 'University-wise Employee Report', description: 'Employee count by university with type and gender breakdown', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5', color: 'from-blue-500 to-blue-600', stateOnly: true },
  { key: 'employee-strength', label: 'Employee Strength Report', description: 'Sanctioned posts, filled posts, and vacancies per university', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'from-emerald-500 to-emerald-600', stateOnly: true },
];

const commonReports: ReportDef[] = [
  { key: 'department-wise', label: 'Department-wise Report', description: 'Employee distribution across departments', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', color: 'from-violet-500 to-violet-600' },
  { key: 'subject-wise', label: 'Subject-wise Report', description: 'Employee count grouped by subject', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', color: 'from-amber-500 to-amber-600' },
  { key: 'designation-wise', label: 'Designation-wise Report', description: 'Employee distribution by designation', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138c.18.71.528 1.362 1.066 1.946a3.42 3.42 0 010 4.438', color: 'from-rose-500 to-rose-600' },
  { key: 'category-wise', label: 'Category-wise Report', description: 'Employee count by reservation category', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', color: 'from-cyan-500 to-cyan-600' },
  { key: 'gender-wise', label: 'Gender-wise Report', description: 'Gender distribution with classification breakdown', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: 'from-pink-500 to-pink-600' },
  { key: 'teaching-staff', label: 'Teaching Staff Report', description: 'All active teaching employees', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z', color: 'from-indigo-500 to-indigo-600' },
  { key: 'retirement-due', label: 'Retirement Due Report', description: 'Employees retiring within next 12 months', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'from-orange-500 to-orange-600' },
  { key: 'employee-directory', label: 'Employee Directory', description: 'Contact directory of active employees', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', color: 'from-teal-500 to-teal-600' },
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
        <p className="text-sm text-gray-500 mt-1">Generate and export detailed reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {allReports.map((report) => {
          const isActive = activeReport === report.key;
          return (
            <button
              key={report.key}
              onClick={() => loadReport(report.key)}
              className={`group text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                isActive
                  ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${report.color} flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-105`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={report.icon} />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className={`font-semibold text-sm leading-tight ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>{report.label}</h3>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{report.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {activeReport && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              {(() => {
                const r = allReports.find((r) => r.key === activeReport);
                return r ? (
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center`}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={r.icon} />
                    </svg>
                  </div>
                ) : null;
              })()}
              <h3 className="font-semibold text-gray-900">{allReports.find((r) => r.key === activeReport)?.label}</h3>
            </div>
            <button onClick={exportCSV} disabled={!reportData.length} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-flex items-center gap-3 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                Loading report...
              </div>
            </div>
          ) : flatData.length === 0 ? (
            <div className="p-16 text-center text-gray-400">No data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {columns.map((key) => (
                      <th key={key} className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap text-xs uppercase tracking-wider">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).replace(/\./g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flatData.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      {columns.map((k) => {
                        let val = row[k];
                        if (val && typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                          val = new Date(val).toLocaleDateString('en-IN');
                        }
                        return <td key={k} className="px-4 py-3 whitespace-nowrap text-gray-700">{String(val ?? '-')}</td>;
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
