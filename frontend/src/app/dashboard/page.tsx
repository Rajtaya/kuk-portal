'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { CountUp } from '@/components/ui/count-up';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { DarkModeToggle } from '@/components/ui/dark-mode-toggle';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

function BarChart({ option, style }: { option: any; style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let ec: any;
    import('echarts').then((mod) => {
      ec = mod;
      if (!containerRef.current) return;
      const inst = ec.init(containerRef.current);
      instanceRef.current = inst;
      inst.setOption(option);
      inst.clear();
      inst.setOption(option);
    });
    const onResize = () => instanceRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (instanceRef.current) {
      instanceRef.current.setOption(option, true);
    }
  }, [option]);

  return <div ref={containerRef} style={style} />;
}

interface HierarchyNode {
  name: string;
  children: { name: string; children: { name: string; value: number }[] }[];
}

interface ChartData {
  stats: { universityCount: number; employeeCount: number; sanctionedPosts: number; filledPosts: number; subjectCount: number; vacantSeats: number; designationCount: number };
  designationByUniversity: Record<string, any>[];
  hierarchy: { universityId: string; universityName: string; children: HierarchyNode[] }[];
  categoryDesignation: Record<string, any>[];
  postTypeDesignation: Record<string, any>[];
  genderDesignation: { gender: string; total: number; designations: { name: string; value: number }[] }[];
  sanctionVsPresent: Record<string, any>[];
  designationPostType: { designation: string; postType: string; sanctioned: number; present: number; vacant: number }[];
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

const PT_LABELS: Record<string, string> = { TOTAL: 'Total', BUDGETED: 'Budgeted', SFS: 'Self Financed', CONTRACTUAL: 'Contractual' };

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


function ChartCard({ title, children, className = '', tableData, actions }: {
  title: string; children: React.ReactNode; className?: string;
  tableData?: { headers: string[]; rows: (string | number)[][] };
  actions?: React.ReactNode;
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
      <div className="relative flex items-center justify-center mb-4">
        <div className={`inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-600 px-3 md:px-4 py-1 md:py-0 min-h-8 md:h-10 rounded-lg shadow-[4px_4px_0_0_#312e81] dark:shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#312e81] hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${actions ? 'max-w-[calc(100%-90px)]' : 'max-w-[calc(100%-50px)]'}`}>
          <h3 className="font-semibold text-xs md:text-base tracking-tight text-white text-center leading-tight md:truncate">{title}</h3>
        </div>
        <div className="absolute right-0 flex items-center gap-1">
          {actions}
          <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 text-gray-500 hover:text-gray-800 transition-colors">
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
  const { user, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ChartData | null>(null);
  const [uniData, setUniData] = useState<ChartData | null>(null);
  const [selectedUni, setSelectedUni] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'summary'>('hierarchy');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [sanctionSubjectFilter, setSanctionSubjectFilter] = useState<string>('');
  const [showSanctionSubjectDropdown, setShowSanctionSubjectDropdown] = useState(false);
  const [dpPostType, setDpPostType] = useState<string>('TOTAL');
  const [uniMenuOpen, setUniMenuOpen] = useState(false);
  const genderInstance = useRef<any>(null);
  const subjectDropdownRef = useRef<HTMLDivElement>(null);
  const sanctionFilterRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(e.target as Node)) setShowSubjectDropdown(false);
      if (sanctionFilterRef.current && !sanctionFilterRef.current.contains(e.target as Node)) setShowSanctionSubjectDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isUniAdmin = user?.role === 'UNIVERSITY_ADMIN';

  useEffect(() => {
    api.get<ChartData>('/employees/dashboard-charts').then((d) => {
      setData(d);
      if (isUniAdmin && d.hierarchy.length === 1) {
        setSelectedUni(d.hierarchy[0].universityId);
      } else {
        setSelectedUni('all');
      }
    });
  }, [isUniAdmin]);

  useEffect(() => {
    if (!selectedUni || selectedUni === 'all' || isUniAdmin) { setUniData(null); return; }
    api.get<ChartData>(`/employees/dashboard-charts?universityId=${selectedUni}`).then(setUniData);
  }, [selectedUni, isUniAdmin]);

  const desigList = useMemo(() => data?.designations || [], [data]);
  const isAllUni = selectedUni === 'all';
  const activeData = isUniAdmin ? data : ((!isAllUni && uniData) ? uniData : data);

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
    const uniCodeMap = Object.fromEntries((data.universities || []).map(u => [u.name, u.code]));
    const categories = rows.map(r => uniCodeMap[r.university] || r.university);
    const totals = rows.map(r => desigList.reduce((s, d) => s + (Number(r[d]) || 0), 0));

    if (isUniAdmin && activeData?.sanctionVsPresent) {
      // University Admin: Sanctioned vs Filled by Designation
      const svpRows = activeData.sanctionVsPresent;
      const allKeys = [...new Set(svpRows.flatMap(r => Object.keys(r).filter(k => k !== 'subject')))];
      const desigs = [...new Set(allKeys.map(k => k.replace(/^(Sanction|Present) - /, '')))].sort();
      const sanctioned = desigs.map(d => svpRows.reduce((sum, r) => sum + (Number(r[`Sanction - ${d}`]) || 0), 0));
      const filled = desigs.map(d => svpRows.reduce((sum, r) => sum + (Number(r[`Present - ${d}`]) || 0), 0));
      const vacant = desigs.map((_, i) => Math.max(0, sanctioned[i] - filled[i]));
      return {
        tooltip: {
          trigger: 'axis' as const, ...TOOLTIP_BASE, axisPointer: { type: 'none' as const },
          formatter: (params: any) => {
            const idx = params[0]?.dataIndex;
            const desig = desigs[idx];
            const s = sanctioned[idx]; const f = filled[idx]; const v = vacant[idx];
            const pct = s > 0 ? Math.round((f / s) * 100) : 0;
            const dot = (c: string) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};margin-right:6px"></span>`;
            return `<div style="min-width:200px">
              <p style="font-weight:600;margin:0 0 8px;color:#111827">${desig}</p>
              <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span>${dot('#3B82F6')}Sanctioned</span><b>${s}</b></div>
              <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span>${dot('#10B981')}Filled</span><b>${f}</b></div>
              <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span>${dot('#EF4444')}Vacant</span><b>${v}</b></div>
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:6px 0"/>
              <p style="text-align:center;font-size:12px;color:#6B7280;margin:0">Fill Rate: <b style="color:${pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'}">${pct}%</b></p>
            </div>`;
          },
        },
        legend: { bottom: 0, icon: 'circle', itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 13, fontWeight: 600, color: '#111827' } },
        grid: { top: 30, right: 20, bottom: 70, left: 50, containLabel: true },
        xAxis: {
          type: 'category' as const, data: desigs,
          axisLabel: { fontSize: isMobile ? 9 : 12, fontWeight: 600, color: '#374151', interval: 0, rotate: isMobile ? -30 : 0 },
          axisLine: { lineStyle: { color: '#000', width: 2 } }, z: 10,
        },
        yAxis: {
          type: 'value' as const,
          name: 'Posts', nameTextStyle: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
          axisLabel: { fontSize: 13, fontWeight: 700, color: '#374151' },
          axisLine: { show: true, lineStyle: { color: '#000', width: 2 } },
        },
        series: [
          { name: 'Sanctioned', type: 'bar' as const, barWidth: isMobile ? 35 : 80, barGap: '15%',
            data: sanctioned, itemStyle: { color: '#3B82F6', borderRadius: [4, 4, 0, 0] },
            label: { show: true, position: 'top' as const, fontSize: 13, fontWeight: 800, color: '#1E3A8A', formatter: (p: any) => p.value > 0 ? p.value : '' } },
          { name: 'Filled', type: 'bar' as const, barWidth: isMobile ? 35 : 80,
            data: filled, itemStyle: { color: '#10B981', borderRadius: [4, 4, 0, 0] },
            label: { show: true, position: 'top' as const, fontSize: 13, fontWeight: 800, color: '#065F46', formatter: (p: any) => p.value > 0 ? p.value : '' } },
          { name: 'Vacant', type: 'bar' as const, barWidth: isMobile ? 35 : 80,
            data: vacant, itemStyle: { color: '#EF4444', borderRadius: [4, 4, 0, 0] },
            label: { show: true, position: 'top' as const, fontSize: 13, fontWeight: 800, color: '#991B1B', formatter: (p: any) => p.value > 0 ? p.value : '' } },
        ],
      };
    }

    // Super Admin / State User: stacked bars
    return {
      tooltip: { trigger: 'item' as const, ...TOOLTIP_BASE, formatter: barTooltipFormatter },
      legend: { bottom: 0, icon: 'circle', itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 13, fontWeight: 600, color: '#111827' } },
      grid: { top: 30, right: isMobile ? 10 : 20, bottom: isMobile ? 100 : 80, left: isMobile ? 10 : 50, containLabel: true },
      xAxis: {
        type: 'category' as const, data: categories,
        axisLabel: { rotate: isMobile ? -55 : -40, fontSize: isMobile ? 10 : 13, interval: 0, color: '#1f2937', fontWeight: 700, width: isMobile ? 60 : 100, overflow: 'truncate' as const },
        axisLine: { lineStyle: { color: '#000', width: 2 } }, z: 10,
      },
      yAxis: {
        type: 'value' as const,
        name: isMobile ? 'Count' : 'Employee Count', nameTextStyle: { fontSize: isMobile ? 12 : 14, fontWeight: 'bold', color: '#111827' },
        axisLabel: { fontSize: isMobile ? 11 : 13, fontWeight: 700, color: '#374151' },
        axisLine: { show: true, lineStyle: { color: '#000', width: 2 } },
      },
      series: desigList.map((d, i) => ({
        name: d, type: 'bar' as const, stack: 'total', barWidth: isMobile ? 18 : 65,
        data: rows.map(r => Number(r[d]) || 0),
        itemStyle: { color: getDesigColor(d, i), borderColor: '#fff', borderWidth: 1 },
        emphasis: { focus: 'series' as const },
        ...(i === desigList.length - 1 ? {
          label: { show: true, position: 'top' as const, fontSize: isMobile ? 11 : 14, fontWeight: 800, color: '#111827',
            formatter: (p: any) => totals[p.dataIndex] || '' },
        } : {}),
      })),
    };
  }, [data, desigList, isMobile, isUniAdmin, activeData]);

  // --- Chart 2: Sunburst data ---
  const sunburstEchartsData = useMemo(() => {
    let subjects = [...activeSubjects];
    if (subjectFilter) subjects = subjects.filter(s => s.name === subjectFilter);
    if (!subjects.length) return [];
    subjects.sort((a, b) => {
      const totalA = a.children.reduce((s, d) => s + d.children.reduce((s2, pt) => s2 + pt.value, 0), 0);
      const totalB = b.children.reduce((s, d) => s + d.children.reduce((s2, pt) => s2 + pt.value, 0), 0);
      return totalB - totalA;
    });
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
      emphasis: { focus: 'none' as const, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
      levels: [
        {},
        { r0: '0%', r: '22%', label: { rotate: 0, fontSize: 13, fontWeight: 'bold', color: '#fff', overflow: 'truncate' as const, ellipsis: '..', width: 80, align: 'center' as const }, itemStyle: { borderWidth: 2, borderColor: '#fff' } },
        { r0: '22%', r: '46%', label: { rotate: 'radial' as const, fontSize: 10, fontWeight: 600, color: '#fff', padding: 2, minAngle: 8, overflow: 'truncate' as const, ellipsis: '..', width: 70, textBorderColor: 'rgba(0,0,0,0.5)', textBorderWidth: 2 }, itemStyle: { borderWidth: 1.5, borderColor: '#fff' } },
        { r0: '46%', r: '70%', label: { show: true, rotate: 'radial' as const, fontSize: 9, fontWeight: 600, color: '#fff', minAngle: 10, overflow: 'truncate' as const, ellipsis: '..', width: 55, textBorderColor: 'rgba(0,0,0,0.5)', textBorderWidth: 2 }, itemStyle: { borderWidth: 1, borderColor: '#fff' } },
        { r0: '70%', r: '92%', label: { show: true, rotate: 'radial' as const, fontSize: 8, fontWeight: 600, color: '#fff', minAngle: 12, overflow: 'truncate' as const, ellipsis: '..', width: 45, textBorderColor: 'rgba(0,0,0,0.5)', textBorderWidth: 2 }, itemStyle: { borderWidth: 1, borderColor: '#fff' } },
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
      legend: { bottom: 0, icon: 'circle', itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 13, fontWeight: 600, color: '#111827' } },
      grid: { top: 30, right: isMobile ? 10 : 20, bottom: isMobile ? 110 : 100, left: isMobile ? 10 : 20, containLabel: true },
      xAxis: {
        type: 'category' as const, data: categories,
        axisLabel: { rotate: isMobile ? -55 : -35, fontSize: isMobile ? 8 : (isAllUni ? 10 : 11), interval: 0, color: '#374151', fontWeight: 500 },
        axisLine: { lineStyle: { color: '#000', width: 2 } }, z: 10,
      },
      yAxis: {
        type: 'value' as const,
        name: 'Employee Count', nameTextStyle: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
        axisLabel: { fontSize: 13, fontWeight: 700, color: '#374151' },
        axisLine: { show: true, lineStyle: { color: '#000', width: 2 } },
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
          label: { show: true, position: 'top' as const, fontSize: isMobile ? 11 : 14, fontWeight: 800, color: '#111827',
            formatter: (p: any) => totals[p.dataIndex] || '' },
        } : {}),
      })),
    };
  }, [activeSubjects, subjectFilter, isAllUni, isMobile]);

  // --- Charts 4 & 5: Category-wise (sunburst) and Employment Type ---
  const CATEGORY_COLORS: Record<string, string> = { SC: '#3B82F6', BCA: '#10B981', GENERAL: '#F59E0B', EWS: '#8B5CF6', BCB: '#EF4444', BCA_BACKLOG: '#06B6D4', ESM: '#EC4899', PH: '#14B8A6', FF: '#F97316' };
  const categoryOption = useMemo(() => {
    if (!activeData) return null;
    const rows = activeData.categoryDesignation;
    const udDesigs = activeData.designations || [];
    const sunburstData = rows.map((r, ci) => ({
      name: r.category,
      itemStyle: { color: CATEGORY_COLORS[r.category] || RING_COLORS[ci % RING_COLORS.length] },
      children: udDesigs.map((d, di) => {
        const val = Number(r[d]) || 0;
        if (val === 0) return null;
        return { name: d, value: val, itemStyle: { color: getDesigColor(d, di) } };
      }).filter(Boolean),
    })).filter(r => r.children.length > 0);
    return {
      tooltip: {
        ...TOOLTIP_BASE, trigger: 'item' as const,
        formatter: (params: any) => {
          if (!params.value) return `<div style="font-size:13px"><b>${params.name}</b></div>`;
          return `<div style="font-size:13px"><b>${params.name}</b>: ${params.value}</div>`;
        },
      },
      series: [{
        type: 'sunburst' as const,
        data: [{ name: 'Category', itemStyle: { color: '#2563EB' }, children: sunburstData }],
        radius: ['0%', '90%'],
        sort: undefined,
        nodeClick: 'rootToNode' as const,
        emphasis: { focus: 'none' as const, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
        levels: [
          {},
          { r0: '0%', r: '22%', label: { rotate: 0, fontSize: 13, fontWeight: 'bold', color: '#fff', overflow: 'truncate' as const, ellipsis: '..', width: 70, align: 'center' as const }, itemStyle: { borderWidth: 2, borderColor: '#fff' } },
          { r0: '22%', r: '55%', label: { rotate: 0, fontSize: 11, fontWeight: 'bold', color: '#fff', minAngle: 8, overflow: 'truncate' as const, ellipsis: '..', width: 70, align: 'center' as const }, itemStyle: { borderWidth: 2, borderColor: '#fff' } },
          { r0: '55%', r: '90%', label: { show: true, rotate: 'radial' as const, fontSize: 9, fontWeight: 600, color: '#fff', minAngle: 10, overflow: 'truncate' as const, ellipsis: '..', width: 55, textBorderColor: 'rgba(0,0,0,0.5)', textBorderWidth: 2 }, itemStyle: { borderWidth: 1, borderColor: '#fff' } },
        ],
      }],
    };
  }, [activeData]);

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
    const allRows = activeData.sanctionVsPresent;
    const rows = sanctionSubjectFilter ? allRows.filter(r => r.subject === sanctionSubjectFilter) : allRows;
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
  }, [activeData, isMobile, sanctionSubjectFilter]);

  const sanctionSubjects = useMemo(() => activeData?.sanctionVsPresent?.map(r => r.subject) || [], [activeData]);

  // --- Chart 8: Sanctioned vs Filled by Designation (one post type at a time) ---
  // Post types that actually have sanctioned posts in the current scope — these drive the switch.
  const dpPostTypes = useMemo(() => {
    if (!activeData?.designationPostType?.length) return [] as string[];
    const set = new Set<string>();
    activeData.designationPostType.forEach(r => { if (r.sanctioned > 0) set.add(r.postType); });
    const types = ['BUDGETED', 'SFS', 'CONTRACTUAL'].filter(p => set.has(p));
    return types.length > 0 ? [...types, 'TOTAL'] : [];
  }, [activeData]);

  // The selected post type, snapped to one that exists in the current scope.
  const dpEffective = useMemo(
    () => (dpPostTypes.includes(dpPostType) ? dpPostType : (dpPostTypes[0] || 'BUDGETED')),
    [dpPostTypes, dpPostType],
  );

  const desigPostTypeOption = useMemo(() => {
    if (!activeData?.designationPostType?.length || !dpPostTypes.length) return null;
    const desigOrder = ['Senior Professor', 'Professor', 'Associate Professor', 'Assistant Professor', 'Other Teaching Posts'];
    const isTotal = dpEffective === 'TOTAL';
    let rows: { designation: string; sanctioned: number; present: number; vacant: number; postType: string }[];
    if (isTotal) {
      const agg = new Map<string, { sanctioned: number; present: number; vacant: number }>();
      activeData.designationPostType.forEach(r => {
        const cur = agg.get(r.designation) || { sanctioned: 0, present: 0, vacant: 0 };
        cur.sanctioned += r.sanctioned; cur.present += r.present; cur.vacant += r.vacant;
        agg.set(r.designation, cur);
      });
      rows = [...agg.entries()].map(([designation, v]) => ({ designation, ...v, postType: 'TOTAL' }));
    } else {
      rows = activeData.designationPostType.filter(r => r.postType === dpEffective);
    }
    rows.sort((a, b) => {
      const ia = desigOrder.indexOf(a.designation); const ib = desigOrder.indexOf(b.designation);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    if (!rows.length) return null;
    const categories = rows.map(r => r.designation);
    const sanctioned = rows.map(r => r.sanctioned);
    const filled = rows.map(r => r.present);
    const vacant = rows.map(r => r.vacant);
    return {
      tooltip: {
        trigger: 'axis' as const, ...TOOLTIP_BASE, axisPointer: { type: 'none' as const },
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex;
          const s = sanctioned[idx]; const f = filled[idx]; const v = vacant[idx];
          const pct = s > 0 ? Math.round((f / s) * 100) : 0;
          const dot = (c: string) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};margin-right:6px"></span>`;
          return `<div style="min-width:210px">
            <p style="font-weight:600;margin:0 0 8px;color:#111827">${categories[idx]} — ${PT_LABELS[dpEffective] || dpEffective}</p>
            <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span>${dot('#3B82F6')}Sanctioned</span><b>${s}</b></div>
            <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span>${dot('#10B981')}Filled</span><b>${f}</b></div>
            <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px"><span>${dot('#EF4444')}Vacant</span><b>${v}</b></div>
            <hr style="border:none;border-top:1px solid #E5E7EB;margin:6px 0"/>
            <p style="text-align:center;font-size:12px;color:#6B7280;margin:0">Fill Rate: <b style="color:${pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'}">${pct}%</b></p>
          </div>`;
        },
      },
      legend: { bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 12, color: '#374151' } },
      grid: { top: 30, right: 20, bottom: 60, left: 50, containLabel: true },
      xAxis: {
        type: 'category' as const, data: categories,
        axisLabel: { fontSize: isMobile ? 10 : 12, fontWeight: 600, color: '#374151', interval: 0, rotate: isMobile ? -20 : 0, margin: 12 },
        axisLine: { lineStyle: { color: '#374151', width: 1.5 } },
      },
      yAxis: {
        type: 'value' as const,
        name: 'Posts', nameTextStyle: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
        axisLine: { show: true, lineStyle: { color: '#374151', width: 1.5 } },
      },
      series: [
        { name: 'Sanctioned', type: 'bar' as const, barGap: '10%', barWidth: isMobile ? 16 : 38,
          data: sanctioned, itemStyle: { color: '#3B82F6', borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top' as const, fontSize: 11, fontWeight: 700, color: '#1E3A8A', formatter: (p: any) => p.value > 0 ? p.value : '' } },
        { name: 'Filled', type: 'bar' as const, barWidth: isMobile ? 16 : 38,
          data: filled, itemStyle: { color: '#10B981', borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top' as const, fontSize: 11, fontWeight: 700, color: '#065F46', formatter: (p: any) => p.value > 0 ? p.value : '' } },
        { name: 'Vacant', type: 'bar' as const, barWidth: isMobile ? 16 : 38,
          data: vacant, itemStyle: { color: '#EF4444', borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top' as const, fontSize: 11, fontWeight: 700, color: '#991B1B', formatter: (p: any) => p.value > 0 ? p.value : '' } },
      ],
    };
  }, [activeData, dpEffective, dpPostTypes, isMobile]);

  if (!data) {
    return (
      <div className="space-y-6">
        {/* scope bar skeleton */}
        <div className="animate-pulse bg-gradient-to-r from-primary-600/40 to-primary-800/40 h-[88px]" />
        {/* main chart skeleton */}
        <div className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl h-[460px]" />
        {/* secondary charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl h-[360px]" />
          <div className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl h-[360px]" />
        </div>
      </div>
    );
  }

  // Top stat cards reflect the selected university (fall back to global totals for "all" or while its data loads)
  const stats = isUniAdmin ? data.stats : ((!isAllUni && uniData) ? uniData.stats : data.stats);
  const selectedUniCode = isAllUni ? undefined : data.universities.find((u) => u.id === selectedUni)?.code;
  const goToSanctioned = () => router.push((!isUniAdmin && selectedUniCode) ? `/sanctioned-posts?university=${selectedUniCode}` : '/sanctioned-posts');
  // A specific university's stats arrive a moment after the page data. Until they do, count from 0
  // instead of flashing the all-university totals (which made the header look out of scope).
  const scopeReady = isUniAdmin || isAllUni || !!uniData;

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
      {/* University filter drawer — slides in from the left (matches Employees / Sanctioned Posts) */}
      {!isUniAdmin && (
        <>
          {uniMenuOpen && <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={() => setUniMenuOpen(false)} />}
          <div className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${uniMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">University</h3>
              <button onClick={() => setUniMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors" aria-label="Close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <button
                onClick={() => { setSelectedUni('all'); setSubjectFilter(''); setUniMenuOpen(false); }}
                className={`w-full text-left px-5 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${isAllUni ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 font-semibold' : 'text-gray-700 dark:text-gray-200'}`}
              >All Universities</button>
              {data.universities.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUni(u.id); setSubjectFilter(''); setUniMenuOpen(false); }}
                  className={`w-full text-left px-5 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedUni === u.id ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 font-semibold' : 'text-gray-700 dark:text-gray-200'}`}
                >
                  <span className="font-mono text-xs text-gray-400 mr-2">{u.code}</span>{u.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Scope bar — super/state: funnel + filtered scope. University admin: their own university (locked, no filter). */}
      {(
        <div className="md:sticky md:top-0 z-30 bg-gradient-to-r from-primary-600 to-primary-800 px-3 md:px-5 py-2 md:py-3 flex flex-wrap md:flex-nowrap items-center gap-x-3 md:gap-x-4 gap-y-2 shadow-[6px_6px_0_0_#1c1917] dark:shadow-[6px_6px_0_0_#000]">
          {!isUniAdmin ? (
            <button
              onClick={() => setUniMenuOpen(true)}
              aria-label="Filter by university"
              title="Filter by university"
              className="shrink-0 flex items-center justify-center bg-white/15 hover:bg-white/25 text-white border border-white/40 p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
              </svg>
            </button>
          ) : (
            <div className="shrink-0 flex items-center justify-center bg-white/15 border border-white/40 p-2" aria-hidden="true">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21" />
              </svg>
            </div>
          )}

          <div className="min-w-0 md:flex-1">
            <p className="text-white/70 text-xs font-mono font-medium uppercase tracking-widest">{isUniAdmin ? 'Logged in as' : (isAllUni ? 'Viewing' : 'Filtered View')}</p>
            <p className="text-white text-lg font-serif font-bold truncate">{isUniAdmin ? (user?.university?.name || 'My University') : selectedUniName}</p>
          </div>

          {/* Post-occupancy stats — on desktop: inline in one row; on mobile: full-width row with flex-1 cards */}
          <div className="flex items-center gap-1.5 md:gap-3 ml-auto w-full md:w-auto order-last md:order-none">
            {isAllUni && (
              <button
                type="button"
                onClick={() => router.push('/universities')}
                title="View universities"
                className="flex-1 md:flex-initial flex flex-col items-center justify-center px-2 md:px-3 py-1.5 bg-gradient-to-br from-violet-500 to-violet-700 shadow-[3px_3px_0_0_rgba(28,25,23,0.45)] transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[5px_5px_0_0_rgba(28,25,23,0.55)] focus:outline-none focus:ring-2 focus:ring-white/70"
              >
                <CountUp value={stats.universityCount} className="font-serif font-bold text-white text-lg md:text-2xl leading-none tabular-nums" />
                <span className="font-mono uppercase tracking-wider text-white/80 text-[8px] md:text-[10px] mt-1">Unis</span>
              </button>
            )}
            <button
              type="button"
              onClick={goToSanctioned}
              title="View sanctioned posts"
              className="flex-1 md:flex-initial flex flex-col items-center justify-center px-2 md:px-3 py-1.5 bg-gradient-to-br from-blue-500 to-blue-700 shadow-[3px_3px_0_0_rgba(28,25,23,0.45)] transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[5px_5px_0_0_rgba(28,25,23,0.55)] focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              <CountUp value={scopeReady ? (stats.sanctionedPosts ?? 0) : 0} className="font-serif font-bold text-white text-lg md:text-2xl leading-none tabular-nums" />
              <span className="font-mono uppercase tracking-wider text-white/80 text-[8px] md:text-[10px] mt-1">Sanct.</span>
            </button>
            <button
              type="button"
              onClick={goToSanctioned}
              title="View sanctioned posts"
              className="flex-1 md:flex-initial flex flex-col items-center justify-center px-2 md:px-3 py-1.5 bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-[3px_3px_0_0_rgba(28,25,23,0.45)] transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[5px_5px_0_0_rgba(28,25,23,0.55)] focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              <CountUp value={scopeReady ? (stats.filledPosts ?? 0) : 0} className="font-serif font-bold text-white text-lg md:text-2xl leading-none tabular-nums" />
              <span className="font-mono uppercase tracking-wider text-white/80 text-[8px] md:text-[10px] mt-1">Filled</span>
            </button>
            <button
              type="button"
              onClick={goToSanctioned}
              title="View sanctioned posts"
              className="flex-1 md:flex-initial flex flex-col items-center justify-center px-2 md:px-3 py-1.5 bg-gradient-to-br from-red-500 to-red-700 shadow-[3px_3px_0_0_rgba(28,25,23,0.45)] transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[5px_5px_0_0_rgba(28,25,23,0.55)] focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              <CountUp value={scopeReady ? stats.vacantSeats : 0} className="font-serif font-bold text-white text-lg md:text-2xl leading-none tabular-nums" />
              <span className="font-mono uppercase tracking-wider text-white/80 text-[8px] md:text-[10px] mt-1">Vacant</span>
            </button>
          </div>

          {/* Account controls */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 pl-2 ml-1 border-l border-white/25">
            <ThemeToggle variant="scopebar" />
            <span className="hidden md:flex"><DarkModeToggle variant="scopebar" /></span>
            <button
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="flex flex-col items-center justify-center px-2 md:px-3 py-1.5 min-w-0 md:min-w-[72px] bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[3px_3px_0_0_rgba(28,25,23,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[5px_5px_0_0_rgba(28,25,23,0.55)] focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-mono uppercase tracking-wider text-white/80 text-[9px] mt-1 hidden md:block">Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. Employee Distribution by Designation — hidden for uni admin (redundant with the Sanctioned vs Filled chart below) */}
      {!isUniAdmin && (
        <ChartCard
          title="Employee Distribution by Designation Across Universities"
          tableData={{ headers: ['University', ...desigList], rows: data.designationByUniversity.map(row => [row.university, ...desigList.map(d => row[d] || 0)]) }}
        >
          <ReactECharts option={employeeDistOption} style={{ height: isMobile ? '350px' : '420px' }} notMerge={true} lazyUpdate={true} onEvents={{ click: handleUniversityBarClick }} />
        </ChartCard>
      )}

      {desigPostTypeOption && (
        <ChartCard
          title="Sanctioned vs Filled by Designation"
          tableData={{
            headers: ['Designation', 'Sanctioned', 'Filled', 'Vacant'],
            rows: dpEffective === 'TOTAL'
              ? [...activeData!.designationPostType.reduce((m, r) => {
                  const c = m.get(r.designation) || { s: 0, p: 0, v: 0 };
                  c.s += r.sanctioned; c.p += r.present; c.v += r.vacant;
                  m.set(r.designation, c); return m;
                }, new Map<string, { s: number; p: number; v: number }>()).entries()].map(([d, v]) => [d, v.s, v.p, v.v])
              : activeData!.designationPostType
                .filter(r => r.postType === dpEffective)
                .map(r => [r.designation, r.sanctioned, r.present, r.vacant]),
          }}
        >
          {dpPostTypes.length > 0 && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">Post type</span>
              <div className="inline-flex border border-gray-300 dark:border-gray-700">
                {dpPostTypes.map((pt) => (
                  <button
                    key={pt}
                    onClick={() => setDpPostType(pt)}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${dpEffective === pt ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    {PT_LABELS[pt] || pt}
                  </button>
                ))}
              </div>
            </div>
          )}
          <BarChart option={desigPostTypeOption} style={{ height: isMobile ? '360px' : '460px' }} />
        </ChartCard>
      )}

      {/* 2 & 3. Hierarchy View / Summary Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 relative z-10">
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('hierarchy')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'hierarchy' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >Hierarchy View</button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >Summary Chart</button>
          </div>
          <div className="relative" ref={subjectDropdownRef}>
            <button
              onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
              className="flex items-center gap-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              title="Filter by Subject"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              {subjectFilter && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
            </button>
            {showSubjectDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px] max-h-60 overflow-y-auto">
                <button onClick={() => { setSubjectFilter(''); setShowSubjectDropdown(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!subjectFilter ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}>All Subjects</button>
                {uniSubjects.map((s) => (
                  <button key={s} onClick={() => { setSubjectFilter(s); setShowSubjectDropdown(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${subjectFilter === s ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}>{s}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeTab === 'hierarchy' ? (
          <div>
            <div className="flex justify-center mb-3">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-600 px-3 md:px-4 py-1 md:py-0 min-h-8 md:h-10 rounded-lg shadow-[4px_4px_0_0_#312e81] hover:shadow-[2px_2px_0_0_#312e81] hover:translate-x-[2px] hover:translate-y-[2px] transition-all max-w-[90%]">
                <h4 className="font-semibold text-xs md:text-base tracking-tight text-white text-center leading-tight md:truncate">Employee Breakdown - {selectedUniName}</h4>
              </div>
            </div>
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
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-4 pb-3 text-xs">
                  <span className="font-semibold text-gray-600">Center: Category</span>
                  <span className="font-semibold text-gray-600">Ring 1: Categories</span>
                  <span className="font-semibold text-gray-600">Ring 2: Designations</span>
                  <span className="italic text-gray-400">Click a segment to drill down</span>
                </div>
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
                actions={
                  <div className="relative" ref={sanctionFilterRef}>
                    <button
                      onClick={() => setShowSanctionSubjectDropdown(!showSanctionSubjectDropdown)}
                      className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      title="Filter by Subject"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                      {sanctionSubjectFilter && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                    </button>
                    {showSanctionSubjectDropdown && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px] max-h-60 overflow-y-auto">
                        <button onClick={() => { setSanctionSubjectFilter(''); setShowSanctionSubjectDropdown(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!sanctionSubjectFilter ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}>All Subjects</button>
                        {sanctionSubjects.map((s) => (
                          <button key={s} onClick={() => { setSanctionSubjectFilter(s); setShowSanctionSubjectDropdown(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${sanctionSubjectFilter === s ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}>{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                }
                tableData={{
                  headers: ['Subject', ...([...new Set(activeData.sanctionVsPresent.flatMap(r => Object.keys(r).filter(k => k !== 'subject')))].sort())],
                  rows: activeData.sanctionVsPresent.map(row => {
                    const keys = [...new Set(activeData.sanctionVsPresent.flatMap(r => Object.keys(r).filter(k => k !== 'subject')))].sort();
                    return [row.subject, ...keys.map(k => row[k] || 0)];
                  }),
                }}
              >
                <div className={isMobile ? 'overflow-x-auto -mx-3' : ''}>
                  <ReactECharts option={sanctionOption} style={{ height: isMobile ? '380px' : '480px', minWidth: isMobile ? '700px' : undefined }} notMerge={true} lazyUpdate={true} />
                </div>
              </ChartCard>
            )}

          </div>
        </>
      )}
    </div>
  );
}
