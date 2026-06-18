'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { University } from '@/lib/types';

interface UploadResult {
  success: number;
  failed: number;
  created: number;
  updated: number;
  total: number;
  errors: string[];
}

interface PreviewRow {
  rowNum: number;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  postType: string;
  status: string;
}

type Step = 'select' | 'preview' | 'result';

export default function UploadEmployeesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('select');
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (isSuperAdmin) {
      api.get<University[]>('/universities').then(setUniversities);
    }
  }, [isSuperAdmin]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(ext || '')) {
      setError('Only .xlsx and .xls files are supported');
      return;
    }

    setFile(selected);
    setError('');
    setResult(null);
    setStep('select');
    setPreviewRows([]);
  }

  async function handlePreview() {
    if (!file) { setError('Please select a file'); return; }

    const universityId = isSuperAdmin ? selectedUniversity : user?.university?.id;
    if (!universityId) { setError('Please select a university'); return; }

    setParsing(true);
    setError('');
    try {
      const { Workbook } = await import('exceljs');
      const wb = new Workbook();
      const buffer = await file.arrayBuffer();
      await wb.xlsx.load(buffer);
      const sheet = wb.worksheets[0];
      if (!sheet) { setError('No worksheet found'); setParsing(false); return; }

      const headers: string[] = [];
      sheet.getRow(1).eachCell((cell, col) => { headers[col] = String(cell.value || ''); });

      const rows: PreviewRow[] = [];
      sheet.eachRow((row, num) => {
        if (num === 1) return;
        const obj: Record<string, any> = {};
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          if (headers[col]) obj[headers[col]] = cell.value;
        });
        if (!Object.keys(obj).length) return;
        rows.push({
          rowNum: num,
          name: String(obj['Employee Name'] || obj['name'] || ''),
          employeeId: String(obj['Employee ID'] || obj['employeeId'] || ''),
          department: String(obj['Department'] || obj['department'] || ''),
          designation: String(obj['Designation (Present)'] || obj['designationPresent'] || ''),
          postType: String(obj['Type'] || '').toUpperCase() || 'BUDGETED',
          status: String(obj['Employment Status'] || '').toUpperCase() || 'ACTIVE',
        });
      });

      if (!rows.length) { setError('No data rows found'); setParsing(false); return; }

      const empIds = rows.map(r => r.employeeId).filter(Boolean);
      if (empIds.length > 0) {
        try {
          const existing = await api.get<string[]>(`/employees/check-duplicates?universityId=${universityId}&ids=${empIds.join(',')}`);
          setDuplicateIds(new Set(existing));
        } catch {
          setDuplicateIds(new Set());
        }
      }

      setPreviewRows(rows);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  }

  async function handleUpload() {
    if (!file) return;

    const universityId = isSuperAdmin ? selectedUniversity : user?.university?.id;
    if (!universityId) return;

    setUploading(true);
    setError('');

    try {
      const res = await api.uploadFile<UploadResult>(
        '/employees/bulk-upload',
        file,
        { universityId },
      );
      setResult(res);
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setError('');
    setStep('select');
    setPreviewRows([]);
    setDuplicateIds(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function downloadTemplate() {
    fetch('/api/employees/template', { credentials: 'include' })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'employee-upload-template.xlsx';
        a.click();
        URL.revokeObjectURL(a.href);
      });
  }

  const expectedColumns = [
    'Employee Name', 'Employee ID', 'Department', 'Subject', 'Category', 'Category(Selection)',
    'Type', 'Designation(appointment)', 'Designation (Present)', 'Gender',
    'Date of Joining', 'Retirement Date', 'Employment Status', 'Mobile Number', 'Email Address',
  ];

  const newCount = previewRows.filter(r => !r.employeeId || !duplicateIds.has(r.employeeId)).length;
  const updateCount = previewRows.filter(r => r.employeeId && duplicateIds.has(r.employeeId)).length;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Upload Employee Data</h2>
          <p className="text-gray-500 mt-1">Import employees from Excel file</p>
        </div>
        <button
          onClick={() => router.push('/employees')}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Back to Employees
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { key: 'select', label: '1. Select File' },
          { key: 'preview', label: '2. Preview' },
          { key: 'result', label: '3. Results' },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-gray-300" />}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${step === s.key ? 'bg-primary-600 text-white' : step === 'result' || (step === 'preview' && s.key === 'select') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* University selector */}
        {isSuperAdmin && step !== 'result' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select University *</label>
            <select
              value={selectedUniversity}
              onChange={(e) => setSelectedUniversity(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Choose a university...</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
              ))}
            </select>
          </div>
        )}

        {!isSuperAdmin && user?.university && step !== 'result' && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
            <p className="text-sm text-primary-800">
              Uploading for: <span className="font-semibold">{user.university.name} ({user.university.code})</span>
            </p>
          </div>
        )}

        {/* STEP 1: File selection */}
        {step === 'select' && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Upload File *</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="font-medium text-gray-700">Click to select a file</p>
                    <p className="text-sm text-gray-400 mt-1">Supports .xlsx, .xls</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-xl p-5 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-primary-800">Download Template</h4>
                <p className="text-xs text-primary-600 mt-1">Get the .xlsx template with all required columns and a sample row</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Template
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-amber-800 mb-2">Expected Column Headers</h4>
              <div className="flex flex-wrap gap-2">
                {expectedColumns.map((col) => (
                  <span key={col} className="px-2.5 py-1 bg-white border border-amber-200 rounded-md text-xs text-amber-900 font-medium">
                    {col}
                  </span>
                ))}
              </div>
              <p className="text-xs text-amber-700 mt-3">
                Rows with an existing Employee ID will be <strong>updated</strong>. New Employee IDs will be <strong>created</strong>. Departments are auto-created if they don&apos;t exist.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                disabled={parsing || !file}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {parsing ? 'Parsing...' : 'Preview Data'}
              </button>
              {file && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </>
        )}

        {/* STEP 2: Preview */}
        {step === 'preview' && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Preview — {previewRows.length} rows</h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-gray-600">{newCount} new</span>
                  </span>
                  {updateCount > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-gray-600">{updateCount} update</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-3 py-2.5 font-semibold text-gray-600 w-10">#</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-600">Name</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-600">Employee ID</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-600">Department</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-600">Designation</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-600">Type</th>
                      <th className="px-3 py-2.5 font-semibold text-gray-600 w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewRows.slice(0, 100).map((row) => {
                      const isUpdate = row.employeeId && duplicateIds.has(row.employeeId);
                      const hasError = !row.name || !row.department;
                      return (
                        <tr key={row.rowNum} className={hasError ? 'bg-red-50/50' : ''}>
                          <td className="px-3 py-2 text-gray-400">{row.rowNum}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{row.name || <span className="text-red-500 italic">Missing</span>}</td>
                          <td className="px-3 py-2 text-gray-600">{row.employeeId || '-'}</td>
                          <td className="px-3 py-2 text-gray-600">{row.department || <span className="text-red-500 italic">Missing</span>}</td>
                          <td className="px-3 py-2 text-gray-600">{row.designation || '-'}</td>
                          <td className="px-3 py-2 text-gray-600">{row.postType || '-'}</td>
                          <td className="px-3 py-2">
                            {hasError ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Error</span>
                            ) : isUpdate ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Update</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">New</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {previewRows.length > 100 && (
                <p className="text-xs text-gray-400 mt-2">Showing first 100 of {previewRows.length} rows</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Uploading...' : 'Confirm & Import'}
              </button>
              <button
                onClick={() => setStep('select')}
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Start Over
              </button>
            </div>
          </>
        )}

        {/* STEP 3: Results */}
        {step === 'result' && result && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Upload Results</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-700">{result.total}</p>
                <p className="text-xs text-gray-500">Total Rows</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{result.created}</p>
                <p className="text-xs text-green-600">Created</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-700">{result.updated}</p>
                <p className="text-xs text-amber-600">Updated</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">{result.failed}</p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-red-700 mb-2">Errors:</p>
                <div className="max-h-40 overflow-y-auto bg-red-50 rounded-lg p-3 space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">{err}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => router.push('/employees')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                View Employees
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Upload Another
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}
      </div>
    </div>
  );
}
