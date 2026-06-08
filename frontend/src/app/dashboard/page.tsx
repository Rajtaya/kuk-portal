'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { StatsSkeleton } from '@/components/ui/skeleton';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface HierarchyNode {
  name: string;
  children: { name: string; children: { name: string; value: number }[] }[];
}

interface ChartData {
  stats: { universityCount: number; employeeCount: number; subjectCount: number; vacantSeats: number; designationCount: number };
  designationByUniversity: Record<string, any>[];
  hierarchy: { universityId: string; universityName: string; children: HierarchyNode[] }[];
  categoryDesignation: Record<string, any>[];
  postTypeDesignation: Record<string, any>[];
  genderDesignation: { gender: string; total: number; designations: { name: string; value: number }[] }[];
  sanctionVsPresent: Record<string, any>[];
  universities: { id: string; name: string; code: string }[];
  designations: string[];
  subjects: string[];
}

const DESIG_COLORS: Record<string, string> = {
  'Professor': '#10B981',
  'Associate Professor': '#8B5CF6',
  'Assistant Professor': '#F59E0B',
  'Senior Professor': '#3B82F6',
  'Other Teaching': '#EC4899',
};

const PT_COLORS: Record<string, string> = {
  BUDGETED: '#3B82F6',
  SFS: '#F59E0B',
  CONTRACTUAL: '#10B981',
};

const RING_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#22C55E', '#A855F7',
  '#0EA5E9', '#D946EF', '#84CC16', '#E11D48', '#0891B2', '#7C3AED',
];

const PT_LABELS: Record<string, string> = { BUDGETED: 'Budgeted', SFS: 'Self Financed', CONTRACTUAL: 'Contractual' };

const UNI_LOGOS: Record<string, string> = {
  KUK: '/logos/KUK.png', MDU: '/logos/MDU.png', CDLU: '/logos/CDLU.jpg',
  CRSU: '/logos/CRSU.png', CBLU: '/logos/CBLU.png', GU: '/logos/GU.jpg',
  MVSU: '/logos/MVSU.png', IGU: '/logos/IGU.jpg', BPSMV: '/logos/BPSMV.png',
  GJU: '/logos/GJU.png', CCSHAU: '/logos/CCSHAU.png', DCRUST: '/logos/DCRUST.jpg',
};

function getDesigColor(name: string, index: number) {
  return DESIG_COLORS[name] || RING_COLORS[index % RING_COLORS.length];
}

const TOOLTIP_BASE: any = {
  backgroundColor: '#fff',
  borderColor: '#E5E7EB',
  borderWidth: 1,
  borderRadius: 8,
  padding: [8, 12],
  textStyle: { fontSize: 12, color: '#374151' },
};

function barTooltipFormatter(params: any) {
  const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${params.color};margin-right:6px"></span>`;
  return `<div style="font-size:12px"><p style="color:#9CA3AF;margin:0 0 3px">${params.name}</p><div style="display:flex;align-items:center">${dot}${params.seriesName}: <b>${params.value}</b></div></div>`;
}

function StatIcon({ type }: { type: 'university' | 'employees' | 'subjects' | 'vacant' | 'designations' }) {
  const icons: Record<string, { bg: string; path: string }> = {
    university: { bg: 'bg-blue-500', path: 'M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4' },
    employees: { bg: 'bg-green-500', path: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    subjects: { bg: 'bg-orange-500', path: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    vacant: { bg: 'bg-yellow-500', path: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    designations: { bg: 'bg-red-500', path: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
  };
  const { bg, path } = icons[type];
  return (
    <div className={`${bg} w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center`}>
      <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
      </svg>
    </div>
  );
}

function ChartCard({ title, children, className = '', tableData }: {
  title: string; children: React.ReactNode; className?: string;
  tableData?: { headers: string[]; rows: (string | number)[][] };
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const downloadCSV = useCallback(() => {
    if (!tableData) return;
    const csv = [tableData.headers.join(','), ...tableData.rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = title.replace(/\s+/g, '_') + '.csv'; a.click();
    setMenuOpen(false);
  }, [tableData, title]);

  const downloadImage = useCallback((format: 'png' | 'jpeg') => {
    const canvas = chartRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.95);
    a.download = `${title.replace(/\s+/g, '_')}.${format}`;
    a.click();
    setMenuOpen(false);
  }, [title]);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-3 md:p-6 ${className}`} ref={chartRef}>
      <div className="flex items-center justify-between mb-4">
        <div />
        <h3 className="font-bold text-gray-800">{title}</h3>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 w-48">
              <button onClick={() => { chartRef.current?.requestFullscreen?.(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">View Fullscreen</button>
              <button onClick={() => { window.print(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Print Chart</button>
              <hr className="my-1" />
              <button onClick={() => downloadImage('png')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Download PNG</button>
              <button onClick={() => downloadImage('jpeg')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Download JPEG</button>
              <hr className="my-1" />
              {tableData && <button onClick={() => downloadCSV()} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Download CSV</button>}
              {tableData && (
                <button onClick={() => { setShowTable(!showTable); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  {showTable ? 'Hide data table' : 'View data table'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {children}
      {showTable && tableData && (
        <div className="mt-4 rounded-lg overflow-hidden border border-gray-700">
          <div className="flex items-center justify-between bg-gray-900 px-4 py-3">
            <h4 className="text-white font-semibold text-sm">{title}</h4>
            <button onClick={() => setShowTable(false)} className="text-gray-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800">
                  {tableData.headers.map((h, i) => (
                    <th key={i} className={`px-4 py-2.5 align-middle text-white font-semibold ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={`px-4 py-2 align-middle text-gray-200 ${ci === 0 ? 'text-left' : 'text-center tabular-nums'}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ChartData | null>(null);
  const [uniData, setUniData] = useState<ChartData | null>(null);
  const [selectedUni, setSelectedUni] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'summary'>('hierarchy');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const genderInstance = useRef<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    api.get<ChartData>('/employees/dashboard-charts').then((d) => {
      setData(d);
      const kuk = d.universities.find((u) => u.code === 'KUK');
      setSelectedUni(kuk ? kuk.id : d.universities[0]?.id || 'all');
    });
  }, []);

  useEffect(() => {
    if (!selectedUni || selectedUni === 'all') { setUniData(null); return; }
    api.get<ChartData>(`/employees/dashboard-charts?universityId=${selectedUni}`).then(setUniData);
  }, [selectedUni]);

  const isUniAdmin = user?.role === 'UNIVERSITY_ADMIN';
  const desigList = useMemo(() => data?.designations || [], [data]);
  const isAllUni = selectedUni === 'all';
  const activeData = (!isAllUni && uniData) ? uniData : data;

  const allSubjectsMerged = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, HierarchyNode>();
    data.hierarchy.forEach((uni) => {
      uni.children.forEach((subj) => {
        const existing = map.get(subj.name);
        if (!existing) {
          map.set(subj.name, { name: subj.name, children: subj.children.map((d) => ({ name: d.name, children: d.children.map((pt) => ({ ...pt })) })) });
        } else {
          subj.children.forEach((desig) => {
            const ed = existing.children.find((d) => d.name === desig.name);
            if (!ed) {
              existing.children.push({ name: desig.name, children: desig.children.map((pt) => ({ ...pt })) });
            } else {
              desig.children.forEach((pt) => {
                const ep = ed.children.find((p) => p.name === pt.name);
                if (!ep) ed.children.push({ ...pt });
                else ep.value += pt.value;
              });
            }
          });
        }
      });
    });
    return [...map.values()];
  }, [data]);

  const activeSubjects = useMemo(() => {
    if (!data) return [];
    if (isAllUni) return allSubjectsMerged;
    const uni = data.hierarchy.find((h) => h.universityId === selectedUni);
    return uni?.children || [];
  }, [data, isAllUni, selectedUni, allSubjectsMerged]);

  const selectedUniName = useMemo(() => {
    if (isAllUni) return 'All Universities';
    return data?.hierarchy.find((h) => h.universityId === selectedUni)?.universityName || '';
  }, [data, selectedUni, isAllUni]);

  const uniSubjects = useMemo(() => {
    if (isAllUni) return allSubjectsMerged.map((c) => c.name).sort();
    const uni = data?.hierarchy.find((h) => h.universityId === selectedUni);
    return uni?.children.map((c) => c.name).sort() || [];
  }, [data, selectedUni, isAllUni, allSubjectsMerged]);

  // --- Chart 1: Employee Distribution by Designation ---
  const employeeDistOption = useMemo(() => {
    if (!data) return {};
    const rows = data.designationByUniversity;
    const categories = rows.map(r => r.university);
    const totals = rows.map(r => desigList.reduce((s, d) => s + (Number(r[d]) || 0), 0));
    // Grouped bars for university admin (single uni), stacked for super admin / state user (all unis)
    const useGrouped = isUniAdmin;
    return {
      tooltip: useGrouped
        ? { trigger: 'axis' as const, ...TOOLTIP_BASE, axisPointer: { type: 'shadow' as const } }
        : { trigger: 'item' as const, ...TOOLTIP_BASE, formatter: barTooltipFormatter },
      legend: { bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: '#374151' } },
      grid: { top: 30, right: isMobile ? 10 : 20, bottom: isMobile ? 100 : 80, left: isMobile ? 10 : 20, containLabel: true },
      xAxis: {
        type: 'category' as const, data: categories,
        axisLabel: { rotate: isMobile ? -55 : -40, fontSize: isMobile ? 9 : 11, interval: 0, color: '#374151', fontWeight: 500, width: isMobile ? 60 : 100, overflow: 'truncate' as const },
        axisLine: { lineStyle: { color: '#374151', width: 1.5 } },
      },
      yAxis: {
        type: 'value' as const,
        name: 'Employee Count', nameTextStyle: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
        axisLine: { show: true, lineStyle: { color: '#374151', width: 1.5 } },
      },
      series: desigList.map((d, i) => useGrouped ? {
        name: d, type: 'bar' as const, barWidth: isMobile ? 28 : 66, barGap: '15%',
        data: rows.map(r => Number(r[d]) || 0),
        itemStyle: { color: getDesigColor(d, i), borderRadius: [4, 4, 0, 0] },
        emphasis: { focus: 'series' as const },
        label: { show: true, position: 'top' as const, fontSize: 11, fontWeight: 600, color: '#374151',
          formatter: (p: any) => p.value > 0 ? p.value : '' },
      } : {
        name: d, type: 'bar' as const, stack: 'total', barWidth: isMobile ? 18 : 65,
        data: rows.map(r => Number(r[d]) || 0),
        itemStyle: { color: getDesigColor(d, i), borderColor: '#fff', borderWidth: 1 },
        emphasis: { focus: 'series' as const },
        ...(i === desigList.length - 1 ? {
          label: { show: true, position: 'top' as const, fontSize: 11, fontWeight: 600, color: '#374151',
            formatter: (p: any) => totals[p.dataIndex] || '' },
        } : {}),
      }),
    };
  }, [data, desigList, isMobile, isUniAdmin]);

  // --- Chart 2: Sunburst data ---
  const sunburstEchartsData = useMemo(() => {
    let subjects = activeSubjects;
    if (subjectFilter) subjects = subjects.filter(s => s.name === subjectFilter);
    if (!subjects.length) return [];
    return [{
      name: selectedUniName,
      itemStyle: { color: '#2563EB' },
      children: subjects.map((subj, si) => ({
        name: subj.name,
        itemStyle: { color: RING_COLORS[si % RING_COLORS.length] },
        children: subj.children.map((desig) => ({
          name: desig.name,
          itemStyle: { color: getDesigColor(desig.name, si) },
          children: desig.children.map(pt => ({
            name: PT_LABELS[pt.name] || pt.name,
            value: pt.value,
            itemStyle: { color: PT_COLORS[pt.name] || '#94A3B8' },
          })),
        })),
      })),
    }];
  }, [activeSubjects, subjectFilter, selectedUniName]);

  const sunburstOption = useMemo(() => ({
    tooltip: {
      ...TOOLTIP_BASE, trigger: 'item' as const,
      position: (point: number[], _p: any, _d: any, _r: any, size: any) => [
        point[0] - size.contentSize[0] / 2,
        Math.max(10, point[1] - size.contentSize[1] - 20),
      ],
      formatter: (params: any) => {
        if (!params.value) return `<div style="font-size:13px"><b>${params.name}</b></div>`;
        return `<div style="font-size:13px"><b>${params.name}</b>: ${params.value}</div>`;
      },
    },
    series: [{
      type: 'sunburst' as const,
      data: sunburstEchartsData,
      radius: ['0%', '92%'],
      sort: undefined,
      nodeClick: 'rootToNode' as const,
      emphasis: { focus: 'ancestor' as const },
      levels: [
        {},
        { r0: '0%', r: '22%', label: { rotate: 0, fontSize: 14, fontWeight: 'bold', color: '#fff', overflow: 'break' as const, width: 120, align: 'center' as const }, itemStyle: { borderWidth: 2, borderColor: '#fff' } },
        { r0: '22%', r: '46%', label: { rotate: 'radial' as const, fontSize: 11, fontWeight: 500, color: '#111', padding: 2, minAngle: 3 }, itemStyle: { borderWidth: 1.5, borderColor: '#fff' } },
        { r0: '46%', r: '70%', label: { show: true, rotate: 'radial' as const, fontSize: 10, fontWeight: 600, color: '#fff', minAngle: 4, overflow: 'truncate' as const, width: 66, textBorderColor: 'rgba(0,0,0,0.4)', textBorderWidth: 2.5 }, itemStyle: { borderWidth: 1, borderColor: '#fff' } },
        { r0: '70%', r: '92%', label: { show: true, rotate: 'radial' as const, fontSize: 9, fontWeight: 600, color: '#fff', minAngle: 5, overflow: 'truncate' as const, width: 60, textBorderColor: 'rgba(0,0,0,0.4)', textBorderWidth: 2.5 }, itemStyle: { borderWidth: 1, borderColor: '#fff' } },
      ],
    }],
  }), [sunburstEchartsData]);

  // --- Chart 3: Summary bar chart ---
  const summaryOption = useMemo(() => {
    let subjects = activeSubjects;
    if (subjectFilter) subjects = subjects.filter(s => s.name === subjectFilter);
    if (!subjects.length) return null;
    const desigs = [...new Set(subjects.flatMap(s => s.children.map(d => d.name)))];
    const categories = subjects.map(s => s.name);
    const totals = subjects.map(s => s.children.reduce((sum, d) => sum + d.children.reduce((s2, pt) => s2 + pt.value, 0), 0));
    return {
      tooltip: { trigger: 'item' as const, ...TOOLTIP_BASE, formatter: barTooltipFormatter },
      legend: { bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: '#374151' } },
      grid: { top: 30, right: isMobile ? 10 : 20, bottom: isMobile ? 110 : 100, left: isMobile ? 10 : 20, containLabel: true },
      xAxis: {
        type: 'category' as const, data: categories,
        axisLabel: { rotate: isMobile ? -55 : -35, fontSize: isMobile ? 8 : (isAllUni ? 10 : 11), interval: 0, color: '#374151', fontWeight: 500 },
        axisLine: { lineStyle: { color: '#374151', width: 1.5 } },
      },
      yAxis: {
        type: 'value' as const,
        axisLine: { show: true, lineStyle: { color: '#374151', width: 1.5 } },
      },
      ...(isAllUni && subjects.length > 15 ? {
        dataZoom: [
          { type: 'slider' as const, start: 0, end: Math.min(100, (15 / subjects.length) * 100), bottom: 35 },
          { type: 'inside' as const, start: 0, end: Math.min(100, (15 / subjects.length) * 100) },
        ],
      } : {}),
      series: desigs.map((d, i) => ({
        name: d, type: 'bar' as const, stack: 'total', barWidth: isMobile ? 18 : 65,
        data: subjects.map(s => {
          const desig = s.children.find(c => c.name === d);
          return desig ? desig.children.reduce((sum, pt) => sum + pt.value, 0) : 0;
        }),
        itemStyle: { color: getDesigColor(d, i), borderColor: '#fff', borderWidth: 1 },
        emphasis: { focus: 'series' as const },
        ...(i === desigs.length - 1 ? {
          label: { show: true, position: 'top' as const, fontSize: 11, fontWeight: 600, color: '#374151',
            formatter: (p: any) => totals[p.dataIndex] || '' },
        } : {}),
      })),
    };
  }, [activeSubjects, subjectFilter, isAllUni, isMobile]);

  // --- Charts 4 & 5: Category-wise and Employment Type ---
  const categoryOption = useMemo(() => {
    if (!activeData) return null;
    const rows = activeData.categoryDesignation;
    const udDesigs = activeData.designations || [];
    const categories = rows.map(r => r.category);
    const totals = rows.map(r => udDesigs.reduce((s, d) => s + (Number(r[d]) || 0), 0));
    return {
      tooltip: { trigger: 'item' as const, ...TOOLTIP_BASE, formatter: barTooltipFormatter },
      legend: { bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: '#374151' } },
      grid: { top: 30, right: isMobile ? 10 : 20, bottom: isMobile ? 95 : 85, left: isMobile ? 10 : 20, containLabel: true },
      xAxis: {
        type: 'category' as const, data: categories,
        axisLabel: { interval: 0, rotate: isMobile ? -45 : -28, fontSize: isMobile ? 9 : 11, fontWeight: 600, color: '#374151' },
        axisLine: { lineStyle: { color: '#374151', width: 1.5 } },
        name: 'Category', nameLocation: 'middle' as const, nameGap: isMobile ? 64 : 56, nameTextStyle: { fontSize: isMobile ? 11 : 14, fontWeight: 'bold', color: '#374151' },
      },
      yAxis: {
        type: 'value' as const,
        name: 'Employee Count', nameTextStyle: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
        axisLine: { show: true, lineStyle: { color: '#374151', width: 1.5 } },
      },
      series: udDesigs.map((d, i) => ({
        name: d, type: 'bar' as const, stack: 'total', barWidth: isMobile ? 18 : 65,
        data: rows.map(r => Number(r[d]) || 0),
        itemStyle: { color: getDesigColor(d, i), borderColor: '#fff', borderWidth: 1 },
        emphasis: { focus: 'series' as const },
        ...(i === udDesigs.length - 1 ? {
          label: { show: true, position: 'top' as const, fontSize: 11, fontWeight: 600, color: '#374151',
            formatter: (p: any) => totals[p.dataIndex] || '' },
        } : {}),
      })),
    };
  }, [activeData, isMobile]);

  const employmentTypeOption = useMemo(() => {
    if (!activeData) return null;
    const udDesigs = activeData.designations || [];
    const rows: Record<string, any>[] = activeData.postTypeDesignation.map((r: Record<string, any>) => ({ ...r, postType: PT_LABELS[r.postType] || r.postType }));
    const categories = rows.map(r => r.postType);
    const totals = rows.map(r => udDesigs.reduce((s, d) => s + (Number(r[d]) || 0), 0));
    return {
      tooltip: { trigger: 'item' as const, ...TOOLTIP_BASE, formatter: barTooltipFormatter },
      legend: { bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: '#374151' } },
      grid: { top: 30, right: isMobile ? 10 : 20, bottom: 70, left: isMobile ? 10 : 20, containLabel: true },
      xAxis: {
        type: 'category' as const, data: categories,
        axisLabel: { fontSize: isMobile ? 10 : 13, fontWeight: 600, color: '#374151' },
        axisLine: { lineStyle: { color: '#374151', width: 1.5 } },
        name: 'Employment Type', nameLocation: 'middle' as const, nameGap: 35, nameTextStyle: { fontSize: isMobile ? 11 : 14, fontWeight: 'bold', color: '#374151' },
      },
      yAxis: {
        type: 'value' as const,
        name: 'Employee Count', nameTextStyle: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
        axisLine: { show: true, lineStyle: { color: '#374151', width: 1.5 } },
      },
      series: udDesigs.map((d, i) => ({
        name: d, type: 'bar' as const, stack: 'total', barWidth: isMobile ? 18 : 65,
        data: rows.map(r => Number(r[d]) || 0),
        itemStyle: { color: getDesigColor(d, i), borderColor: '#fff', borderWidth: 1 },
        emphasis: { focus: 'series' as const },
        ...(i === udDesigs.length - 1 ? {
          label: { show: true, position: 'top' as const, fontSize: 11, fontWeight: 600, color: '#374151',
            formatter: (p: any) => totals[p.dataIndex] || '' },
        } : {}),
      })),
    };
  }, [activeData, isMobile]);

  // --- Chart 6: Gender donut ---
  const genderChartData = useMemo(() => {
    if (!activeData) return null;
    const maleColors: Record<string, string> = { 'Assistant Professor': '#3730A3', 'Professor': '#1E3A8A', 'Associate Professor': '#7C3AED', 'Senior Professor': '#1E1B4B' };
    const femaleColors: Record<string, string> = { 'Assistant Professor': '#2563EB', 'Professor': '#93C5FD', 'Associate Professor': '#C4B5FD', 'Senior Professor': '#BFDBFE' };
    const genderFill: Record<string, string> = { MALE: '#312E81', FEMALE: '#6366F1' };

    const innerData = activeData.genderDesignation.map(g => ({
      name: g.gender === 'MALE' ? 'Male' : g.gender === 'FEMALE' ? 'Female' : 'Other',
      value: g.total,
      genderKey: g.gender,
      itemStyle: { color: genderFill[g.gender] || '#94A3B8' },
    }));

    const outerData = activeData.genderDesignation.flatMap(g =>
      g.designations.filter(d => d.value > 0).map(d => ({
        name: `${g.gender === 'MALE' ? 'Male' : 'Female'} - ${d.name}`,
        value: d.value,
        gender: g.gender,
        desigName: d.name,
        itemStyle: { color: g.gender === 'MALE' ? (maleColors[d.name] || '#1E3A8A') : (femaleColors[d.name] || '#93C5FD') },
      }))
    );

    const totalAll = innerData.reduce((s, g) => s + g.value, 0);
    return { innerData, outerData, totalAll, maleColors, femaleColors };
  }, [activeData]);

  const genderOption = useMemo(() => {
    if (!genderChartData) return {};
    const { totalAll } = genderChartData;
    return {
      tooltip: {
        ...TOOLTIP_BASE, trigger: 'item' as const,
        formatter: (p: any) => {
          const isOuter = p.seriesName === 'Designation';
          const gender = isOuter ? (p.data?.gender === 'MALE' ? 'Male' : 'Female') : '';
          const desig = isOuter ? p.data?.desigName : '';
          const pct = totalAll > 0 ? ((p.value / totalAll) * 100).toFixed(1) : '0';
          if (isOuter) {
            return `<div style="font-size:12px;min-width:160px">
              <p style="color:#9CA3AF;margin:0 0 3px">${gender}</p>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                <span>${desig}: <b>${p.value}</b> (${pct}%)</span>
              </div>
            </div>`;
          }
          return `<div style="font-size:12px"><div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>${p.name}: <b>${p.value}</b> (${pct}%)</div></div>`;
        },
      },
      series: [
        {
          name: 'Gender', type: 'pie' as const, radius: isMobile ? ['12%', '38%'] : ['15%', '44%'],
          data: genderChartData.innerData,
          label: { show: true, position: 'inside' as const, fontSize: isMobile ? 13 : 16, fontWeight: 'bold', color: '#fff' },
          itemStyle: { borderColor: '#fff', borderWidth: 3 },
          emphasis: { scale: true, scaleSize: 5, itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.25)' } },
          blur: { itemStyle: { opacity: 0.4 } },
        },
        {
          name: 'Designation', type: 'pie' as const, radius: isMobile ? ['42%', '65%'] : ['46%', '72%'],
          data: genderChartData.outerData,
          label: {
            show: !isMobile, fontSize: 12.5, fontWeight: 500, color: '#1F2937',
            formatter: (p: any) => p.data?.desigName || p.name,
          },
          labelLine: { show: !isMobile, length: 18, length2: 12, smooth: true, lineStyle: { width: 1.5 } },
          itemStyle: { borderColor: '#fff', borderWidth: 3 },
          emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.25)' } },
          blur: { itemStyle: { opacity: 0.4 }, label: { opacity: 0.3 }, labelLine: { lineStyle: { opacity: 0.3 } } },
        },
      ],
    };
  }, [genderChartData, isMobile]);

  const onGenderHover = useCallback((gender: string, desigName?: string) => {
    const inst = genderInstance.current;
    if (!inst) return;
    inst.dispatchAction({ type: 'downplay', seriesIndex: 0 });
    inst.dispatchAction({ type: 'downplay', seriesIndex: 1 });
    const gLabel = gender === 'MALE' ? 'Male' : 'Female';
    inst.dispatchAction({ type: 'highlight', seriesIndex: 0, name: gLabel });
    if (desigName) {
      inst.dispatchAction({ type: 'highlight', seriesIndex: 1, name: `${gLabel} - ${desigName}` });
    } else {
      genderChartData?.outerData.filter(d => d.gender === gender).forEach(d => {
        inst.dispatchAction({ type: 'highlight', seriesIndex: 1, name: d.name });
      });
    }
  }, [genderChartData]);

  const onGenderLeave = useCallback(() => {
    const inst = genderInstance.current;
    if (!inst) return;
    inst.dispatchAction({ type: 'downplay', seriesIndex: 0 });
    inst.dispatchAction({ type: 'downplay', seriesIndex: 1 });
  }, []);

  // --- Chart 7: Sanction vs Present ---
  const sanctionOption = useMemo(() => {
    if (!activeData) return null;
    const rows = activeData.sanctionVsPresent;
    const allKeys = [...new Set(rows.flatMap(r => Object.keys(r).filter(k => k !== 'subject')))].sort();
    const sanctionKeys = allKeys.filter(k => k.startsWith('Sanction'));
    const presentKeys = allKeys.filter(k => k.startsWith('Present'));
    const categories = rows.map(r => r.subject);
    const sanctionTotals = rows.map(r => sanctionKeys.reduce((s, k) => s + (Number(r[k]) || 0), 0));
    const presentTotals = rows.map(r => presentKeys.reduce((s, k) => s + (Number(r[k]) || 0), 0));

    const allColors: Record<string, string> = {
      'Sanction - Senior Professor': '#1E3A8A', 'Sanction - Associate Professor': '#6D28D9',
      'Sanction - Professor': '#166534', 'Sanction - Assistant Professor': '#92400E',
      'Present - Senior Professor': '#93C5FD', 'Present - Associate Professor': '#DDD6FE',
      'Present - Professor': '#BBF7D0', 'Present - Assistant Professor': '#FDE68A',
    };

    const sanctionTooltip = (params: any) => {
      const subject = params.name;
      const seriesName = params.seriesName as string;
      const value = params.value as number;
      const isPresent = seriesName.startsWith('Present');
      const designation = seriesName.replace(/^(Sanction|Present) - /, '');
      const counterKey = isPresent ? `Sanction - ${designation}` : `Present - ${designation}`;
      const row = rows.find(r => r.subject === subject);
      const counterVal = row ? (Number(row[counterKey]) || 0) : 0;
      const total = value + counterVal;
      const sVal = isPresent ? counterVal : value;
      const pVal = isPresent ? value : counterVal;
      const sColor = allColors[`Sanction - ${designation}`] || '#666';
      const pColor = allColors[`Present - ${designation}`] || '#999';
      const dot = (c: string) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};margin-right:8px"></span>`;
      return `<div style="min-width:220px">
        <p style="text-align:center;font-size:11px;color:#9CA3AF;margin:0 0 4px">${subject}</p>
        <p style="text-align:center;font-size:28px;font-weight:bold;margin:0;color:#111827">${value}</p>
        <p style="text-align:center;font-size:13px;color:#6B7280;margin:2px 0 10px">Total: ${total}</p>
        <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 8px"/>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:13px">
          <span>${dot(sColor)}Sanction - ${designation}</span><b>${sVal}</b>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:13px">
          <span>${dot(pColor)}Present - ${designation}</span><b>${pVal}</b>
        </div>
      </div>`;
    };

    return {
      tooltip: { trigger: 'item' as const, ...TOOLTIP_BASE, formatter: sanctionTooltip },
      legend: { bottom: 0, icon: 'circle', itemWidth: isMobile ? 8 : 10, itemHeight: isMobile ? 8 : 10, textStyle: { fontSize: isMobile ? 8 : 10, color: '#374151' }, itemGap: isMobile ? 6 : 12 },
      grid: { top: 30, right: 15, bottom: isMobile ? 110 : 90, left: 15, containLabel: true },
      xAxis: {
        type: 'category' as const, data: categories,
        axisLabel: { rotate: isMobile ? -55 : -40, fontSize: isMobile ? 8 : 10, fontWeight: 500, interval: 0, color: '#374151' },
        axisLine: { lineStyle: { color: '#374151', width: 1.5 } },
      },
      yAxis: {
        type: 'value' as const,
        name: 'Count', nameTextStyle: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
        axisLine: { show: true, lineStyle: { color: '#374151', width: 1.5 } },
      },
      series: [
        ...sanctionKeys.map((k, i) => ({
          name: k, type: 'bar' as const, stack: 'sanction', barWidth: isMobile ? 10 : 20, barGap: '10%',
          data: rows.map(r => Number(r[k]) || 0),
          itemStyle: { color: allColors[k] || RING_COLORS[i], borderColor: '#fff', borderWidth: 1 },
          emphasis: { focus: 'series' as const },
          ...(i === sanctionKeys.length - 1 ? {
            label: { show: true, position: 'top' as const, fontSize: 10, fontWeight: 700, color: '#1E3A8A',
              formatter: (p: any) => sanctionTotals[p.dataIndex] || '' },
          } : {}),
        })),
        ...presentKeys.map((k, i) => ({
          name: k, type: 'bar' as const, stack: 'present', barWidth: isMobile ? 10 : 20,
          data: rows.map(r => Number(r[k]) || 0),
          itemStyle: { color: allColors[k] || RING_COLORS[(i + 4)], borderColor: '#fff', borderWidth: 1 },
          emphasis: { focus: 'series' as const },
          ...(i === presentKeys.length - 1 ? {
            label: { show: true, position: 'top' as const, fontSize: 10, fontWeight: 700, color: '#6B7280',
              formatter: (p: any) => presentTotals[p.dataIndex] || '' },
          } : {}),
        })),
      ],
    };
  }, [activeData, isMobile]);

  if (!data) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: 'Dashboard', icon: 'dashboard' }]} />
        <StatsSkeleton count={5} />
        <div className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl h-[460px]" />
      </div>
    );
  }

  // Top stat cards reflect the selected university (fall back to global totals for "all" or while its data loads)
  const stats = (!isAllUni && uniData) ? uniData.stats : data.stats;

  // Click a university's bar in the main chart → drill the rest of the dashboard to that university
  const handleUniversityBarClick = (params: any) => {
    if (isUniAdmin) return;
    const name = params?.name;
    if (!name) return;
    const id =
      data.universities.find((u) => u.name === name || u.code === name)?.id ||
      data.hierarchy.find((h) => h.universityName === name)?.universityId;
    if (id && id !== selectedUni) {
      setSelectedUni(id);
      setSubjectFilter('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Breadcrumb items={[{ label: 'Dashboard', icon: 'dashboard' }]} />
        {!isUniAdmin && (
          <select
            value={selectedUni}
            onChange={(e) => { setSelectedUni(e.target.value); setSubjectFilter(''); }}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 shadow-sm min-w-[220px]"
          >
            <option value="all">All Universities</option>
            {data.universities.map((u) => <option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
          </select>
        )}
      </div>

      {/* Scope indicator — makes clear the stats below reflect the selected university */}
      {!isUniAdmin && !isAllUni && selectedUniName && (
        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21" />
              </svg>
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Filtered View</p>
              <p className="text-white text-base font-semibold">{selectedUniName}</p>
            </div>
          </div>
          <button
            onClick={() => { setSelectedUni('all'); setSubjectFilter(''); }}
            className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors"
          >
            View all universities
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
        {!isUniAdmin && isAllUni && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 md:p-5 flex items-center justify-between gap-2">
            <div><p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Universities</p><p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stats.universityCount}</p></div>
            <StatIcon type="university" />
          </div>
        )}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 md:p-5 flex items-center justify-between gap-2">
          <div><p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Employees</p><p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stats.employeeCount.toLocaleString()}</p></div>
          <StatIcon type="employees" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 md:p-5 flex items-center justify-between gap-2">
          <div><p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Subjects</p><p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stats.subjectCount}</p></div>
          <StatIcon type="subjects" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 md:p-5 flex items-center justify-between gap-2">
          <div><p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Vacant Seats</p><p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stats.vacantSeats.toLocaleString()}</p></div>
          <StatIcon type="vacant" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 md:p-5 flex items-center justify-between gap-2">
          <div><p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Designations</p><p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stats.designationCount}</p></div>
          <StatIcon type="designations" />
        </div>
      </div>

      {/* 1. Employee Distribution by Designation */}
      <ChartCard
        title="Employee Distribution by Designation Across Universities"
        tableData={{ headers: ['University', ...desigList], rows: data.designationByUniversity.map(row => [row.university, ...desigList.map(d => row[d] || 0)]) }}
      >
        <ReactECharts option={employeeDistOption} style={{ height: isMobile ? '350px' : '460px' }} notMerge={true} lazyUpdate={true} onEvents={{ click: handleUniversityBarClick }} />
      </ChartCard>

      {/* 2 & 3. Hierarchy View / Summary Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 relative z-10">
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('hierarchy')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'hierarchy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >Hierarchy View</button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >Summary Chart</button>
          </div>
          <div className="flex gap-2 md:gap-3 flex-wrap">
            {!isUniAdmin && (
              <select
                value={selectedUni}
                onChange={(e) => { setSelectedUni(e.target.value); setSubjectFilter(''); }}
                className="border border-gray-300 rounded-lg px-2 md:px-3 py-1.5 text-sm flex-1 min-w-0 md:flex-none"
              >
                <option value="all">All Universities</option>
                {data.universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 md:px-3 py-1.5 text-sm flex-1 min-w-0 md:flex-none"
            >
              <option value="">Filter Subjects</option>
              {uniSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {activeTab === 'hierarchy' ? (
          <div>
            <h4 className="font-bold text-gray-800 text-center mb-2">Employee Breakdown - {selectedUniName}</h4>
            {sunburstEchartsData.length > 0 && sunburstEchartsData[0].children?.length > 0 ? (
              <>
                <ReactECharts option={sunburstOption} style={{ height: isMobile ? '380px' : '680px' }} notMerge={true} lazyUpdate={true} />
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-2 text-xs">
                  <span className="font-semibold text-gray-600">Center: University</span>
                  <span className="font-semibold text-gray-600">Ring 1: Subjects</span>
                  <span className="font-semibold text-gray-600">Ring 2: Designations</span>
                  <span className="font-semibold text-gray-600">Ring 3: Post Types</span>
                  <span className="text-gray-400 italic">Click a segment to drill down</span>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-400 py-16">No employee data</p>
            )}
          </div>
        ) : (
          <div>
            <h4 className="font-bold text-gray-800 text-center mb-2">Summary - {selectedUniName}</h4>
            {summaryOption ? (
              <ReactECharts option={summaryOption} style={{ height: isMobile ? '350px' : '450px' }} notMerge={true} lazyUpdate={true} />
            ) : (
              <p className="text-center text-gray-400 py-16">No data</p>
            )}
          </div>
        )}
      </div>

      {/* Detailed Analysis charts */}
      {activeData && (
        <>
          <div className="flex items-center gap-3 mt-2">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-sm font-semibold text-gray-500 px-3">{selectedUniName} — Detailed Analysis</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* 4 & 5. Category-wise & Employment Type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {categoryOption && (
              <ChartCard
                title="Category-wise Designation Distribution"
                tableData={{ headers: ['Category', ...(activeData.designations || [])], rows: activeData.categoryDesignation.map(row => [row.category, ...(activeData.designations || []).map(d => row[d] || 0)]) }}
              >
                <ReactECharts option={categoryOption} style={{ height: isMobile ? '320px' : '420px' }} notMerge={true} lazyUpdate={true} />
              </ChartCard>
            )}
            {employmentTypeOption && (
              <ChartCard
                title="Employment Type &rarr; Designation Distribution"
                tableData={{ headers: ['Employment Type', ...(activeData.designations || [])], rows: activeData.postTypeDesignation.map(row => [PT_LABELS[row.postType] || row.postType, ...(activeData.designations || []).map(d => row[d] || 0)]) }}
              >
                <ReactECharts option={employmentTypeOption} style={{ height: isMobile ? '320px' : '420px' }} notMerge={true} lazyUpdate={true} />
              </ChartCard>
            )}
          </div>

          {/* 6 & 7. Gender & Sanction */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Gender & Designation Distribution"
              tableData={genderChartData ? {
                headers: ['Gender', ...(activeData.designations || []), 'Total'],
                rows: activeData.genderDesignation.map(g => [
                  g.gender === 'MALE' ? 'Male' : g.gender === 'FEMALE' ? 'Female' : 'Other',
                  ...(activeData.designations || []).map(d => g.designations.find(x => x.name === d)?.value || 0),
                  g.total,
                ]),
              } : undefined}
            >
              <ReactECharts
                option={genderOption}
                style={{ height: isMobile ? '300px' : '380px' }}
                notMerge={true}
                lazyUpdate={true}
                onChartReady={(instance: any) => { genderInstance.current = instance; }}
              />
              {/* Custom gender legend */}
              {genderChartData && (() => {
                const { outerData, totalAll } = genderChartData;
                const maleSegs = outerData.filter(d => d.gender === 'MALE');
                const femaleSegs = outerData.filter(d => d.gender === 'FEMALE');
                const maleTotal = genderChartData.innerData.find(d => d.genderKey === 'MALE')?.value || 0;
                const femaleTotal = genderChartData.innerData.find(d => d.genderKey === 'FEMALE')?.value || 0;

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', padding: isMobile ? '0 8px 8px' : '0 20px 12px', fontSize: isMobile ? 11 : 12.5 }}>
                    <div>
                      <p style={{ fontWeight: 700, color: '#312E81', marginBottom: 6, fontSize: 13, borderBottom: '2px solid #312E81', paddingBottom: 4, cursor: 'pointer' }}
                        onMouseEnter={() => onGenderHover('MALE')} onMouseLeave={onGenderLeave}>
                        Male ({maleTotal})
                      </p>
                      {maleSegs.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}
                          onMouseEnter={() => onGenderHover('MALE', d.desigName)} onMouseLeave={onGenderLeave}>
                          <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: d.itemStyle.color, flexShrink: 0 }} />
                          <span style={{ color: '#1F2937', fontWeight: 500 }}>{d.desigName}</span>
                          <span style={{ color: '#6B7280', marginLeft: 'auto', fontWeight: 600 }}>{d.value} <span style={{ fontWeight: 400 }}>({totalAll > 0 ? (d.value / totalAll * 100).toFixed(1) : '0'}%)</span></span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: '#6366F1', marginBottom: 6, fontSize: 13, borderBottom: '2px solid #6366F1', paddingBottom: 4, cursor: 'pointer' }}
                        onMouseEnter={() => onGenderHover('FEMALE')} onMouseLeave={onGenderLeave}>
                        Female ({femaleTotal})
                      </p>
                      {femaleSegs.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}
                          onMouseEnter={() => onGenderHover('FEMALE', d.desigName)} onMouseLeave={onGenderLeave}>
                          <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: d.itemStyle.color, flexShrink: 0 }} />
                          <span style={{ color: '#1F2937', fontWeight: 500 }}>{d.desigName}</span>
                          <span style={{ color: '#6B7280', marginLeft: 'auto', fontWeight: 600 }}>{d.value} <span style={{ fontWeight: 400 }}>({totalAll > 0 ? (d.value / totalAll * 100).toFixed(1) : '0'}%)</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </ChartCard>

            {sanctionOption && (
              <ChartCard
                title="Sanction vs Present (Designation-wise)"
                tableData={{
                  headers: ['Subject', ...([...new Set(activeData.sanctionVsPresent.flatMap(r => Object.keys(r).filter(k => k !== 'subject')))].sort())],
                  rows: activeData.sanctionVsPresent.map(row => {
                    const keys = [...new Set(activeData.sanctionVsPresent.flatMap(r => Object.keys(r).filter(k => k !== 'subject')))].sort();
                    return [row.subject, ...keys.map(k => row[k] || 0)];
                  }),
                }}
              >
                <ReactECharts option={sanctionOption} style={{ height: isMobile ? '380px' : '480px' }} notMerge={true} lazyUpdate={true} />
              </ChartCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}
