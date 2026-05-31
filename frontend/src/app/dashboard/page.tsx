'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

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

const SANCTION_COLORS: Record<string, string> = {
  'Sanction - Professor': '#10B981',
  'Sanction - Associate Professor': '#8B5CF6',
  'Sanction - Assistant Professor': '#F59E0B',
  'Sanction - Senior Professor': '#3B82F6',
  'Present - Professor': '#6EE7B7',
  'Present - Associate Professor': '#C4B5FD',
  'Present - Assistant Professor': '#FDE68A',
  'Present - Senior Professor': '#93C5FD',
};

const PT_LABELS: Record<string, string> = { BUDGETED: 'Budgeted', SFS: 'Self Financed', CONTRACTUAL: 'Contractual' };

const UNI_LOGOS: Record<string, string> = {
  KUK: '/logos/KUK.png', MDU: '/logos/MDU.png', CDLU: '/logos/CDLU.jpg',
  CRSU: '/logos/CRSU.png', CBLU: '/logos/CBLU.png', GU: '/logos/GU.jpg',
  MVSU: '/logos/MVSU.png', IGU: '/logos/IGU.jpg', BPSMV: '/logos/BPSMV.png',
  DBRANLU: '/logos/DBRANLU.png', GJU: '/logos/GJU.png', CCSHAU: '/logos/CCSHAU.png',
  DCRUST: '/logos/DCRUST.png', SVSU: '/logos/SVSU.png',
};

function getDesigColor(name: string, index: number) {
  return DESIG_COLORS[name] || RING_COLORS[index % RING_COLORS.length];
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
    <div className={`${bg} w-12 h-12 rounded-xl flex items-center justify-center`}>
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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

  const downloadImage = useCallback((format: 'png' | 'jpeg' | 'svg') => {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    if (format === 'svg') {
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = title.replace(/\s+/g, '_') + '.svg'; a.click();
    } else {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width * 2; canvas.height = img.height * 2;
        ctx!.fillStyle = '#fff'; ctx!.fillRect(0, 0, canvas.width, canvas.height);
        ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const a = document.createElement('a');
        a.href = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.95);
        a.download = title.replace(/\s+/g, '_') + '.' + format; a.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
    setMenuOpen(false);
  }, [title]);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`} ref={chartRef}>
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
              <button onClick={() => downloadImage('svg')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Download SVG</button>
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
                    <th key={i} className="px-4 py-2.5 text-left text-white font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2 text-gray-200">{cell}</td>
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

const renderBarLabel = ({ x, y, width, value }: any) => {
  if (!value) return <text />;
  return <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="#374151">{value}</text>;
};

// Tooltip that only shows the hovered series with large value + total
function HoverOnlyTooltip({ active, payload, label, hoveredKey }: any) {
  if (!active || !payload?.length) return null;
  const item = hoveredKey ? payload.find((p: any) => p.dataKey === hoveredKey) : payload[0];
  if (!item) return null;
  const total = payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-5 py-4 min-w-[200px]">
      <p className="text-xs text-gray-500 mb-1 font-medium text-center">{label}</p>
      <p className="text-3xl font-bold text-center text-gray-800">{item.value}</p>
      <p className="text-sm text-gray-500 text-center mb-3">Total: {total}</p>
      <hr className="mb-3" />
      <div className="flex items-center justify-between gap-4 text-sm py-1">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: item.fill || item.color }} />
          {item.dataKey}
        </span>
        <span className="font-semibold">{item.value}</span>
      </div>
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
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const legendHover = useRef(false);
  const chartMouseMove = (e: any) => { if (!legendHover.current && !e?.activePayload?.length) setHoveredKey(null); };
  const onLegendEnter = (e: any) => { legendHover.current = true; setHoveredKey(e.dataKey || e); };
  const onLegendLeave = () => { legendHover.current = false; setHoveredKey(null); };
  // Drill-down state: null = all subjects, string = drilled into a subject, [subj, desig] = drilled into designation
  const [drillSubject, setDrillSubject] = useState<string | null>(null);
  const [drillDesig, setDrillDesig] = useState<string | null>(null);

  useEffect(() => {
    api.get<ChartData>('/employees/dashboard-charts').then((d) => {
      setData(d);
      const kuk = d.universities.find((u) => u.code === 'KUK');
      setSelectedUni(kuk ? kuk.id : d.universities[0]?.id || 'all');
    });
  }, []);

  // Fetch university-specific data for bottom charts
  useEffect(() => {
    if (!selectedUni || selectedUni === 'all') { setUniData(null); return; }
    api.get<ChartData>(`/employees/dashboard-charts?universityId=${selectedUni}`).then(setUniData);
  }, [selectedUni]);

  const isUniAdmin = user?.role === 'UNIVERSITY_ADMIN';

  const desigList = useMemo(() => data?.designations || [], [data]);

  const isAllUni = selectedUni === 'all';

  // Merge hierarchy children across all universities (aggregate same-named subjects)
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

  // Subjects for chart computation (all or single university)
  const activeSubjects = useMemo(() => {
    if (!data) return [];
    if (isAllUni) return allSubjectsMerged;
    const uni = data.hierarchy.find((h) => h.universityId === selectedUni);
    return uni?.children || [];
  }, [data, isAllUni, selectedUni, allSubjectsMerged]);

  // Sunburst data for selected university (or all)
  const sunburstData = useMemo(() => {
    if (!data) return { ring1: [], ring2: [], ring3: [] };
    let subjects = activeSubjects;
    if (subjectFilter) subjects = subjects.filter((s) => s.name === subjectFilter);

    const ring1: { name: string; value: number; fill: string }[] = [];
    const ring2: { name: string; value: number; fill: string }[] = [];
    const ring3: { name: string; value: number; fill: string }[] = [];

    subjects.forEach((subject, si) => {
      const subTotal = subject.children.reduce((s, d) => s + d.children.reduce((s2, pt) => s2 + pt.value, 0), 0);
      ring1.push({ name: subject.name, value: subTotal, fill: RING_COLORS[si % RING_COLORS.length] });

      subject.children.forEach((desig) => {
        const dTotal = desig.children.reduce((s, pt) => s + pt.value, 0);
        ring2.push({ name: desig.name, value: dTotal, fill: getDesigColor(desig.name, si) });

        desig.children.forEach((pt) => {
          ring3.push({ name: PT_LABELS[pt.name] || pt.name, value: pt.value, fill: PT_COLORS[pt.name] || '#94A3B8' });
        });
      });
    });

    return { ring1, ring2, ring3 };
  }, [data, activeSubjects, subjectFilter]);

  const selectedUniName = useMemo(() => {
    if (isAllUni) return 'All Universities';
    return data?.hierarchy.find((h) => h.universityId === selectedUni)?.universityName || '';
  }, [data, selectedUni, isAllUni]);

  const selectedUniCode = useMemo(() => {
    if (isAllUni) return '';
    return data?.universities.find((u) => u.id === selectedUni)?.code || '';
  }, [data, selectedUni, isAllUni]);

  // Subjects available for the selected university (or all)
  const uniSubjects = useMemo(() => {
    if (isAllUni) return allSubjectsMerged.map((c) => c.name).sort();
    const uni = data?.hierarchy.find((h) => h.universityId === selectedUni);
    return uni?.children.map((c) => c.name).sort() || [];
  }, [data, selectedUni, isAllUni, allSubjectsMerged]);

  // All unique sanction/present keys for the grouped bar chart
  const sanctionKeys = useMemo(() => {
    if (!data) return [];
    const keys = new Set<string>();
    data.sanctionVsPresent.forEach((row) => {
      Object.keys(row).forEach((k) => { if (k !== 'subject') keys.add(k); });
    });
    return [...keys].sort();
  }, [data]);

  const makePieLabel = (minPercent: number, maxChars: number, size: number) =>
    ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
      if (percent < minPercent) return null;
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) / 2;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      const display = name.length > maxChars ? name.substring(0, maxChars - 2) + '..' : name;
      return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight={600}>
          {display}
        </text>
      );
    };
  const labelRing1 = makePieLabel(0.03, 12, 9);   // Subjects: show if >= 3%
  const labelRing2 = makePieLabel(0.015, 10, 8);   // Designations: show if >= 1.5%
  const labelRing3 = makePieLabel(0.01, 9, 7);     // Post Types: show if >= 1%

  if (!data) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading dashboard...</p></div>;
  }

  const { stats } = data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>Home</span><span>&gt;</span><span className="text-gray-800 font-medium">Dashboard UI</span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {!isUniAdmin && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Universities</p>
              <p className="text-3xl font-bold text-gray-900">{stats.universityCount}</p>
            </div>
            <StatIcon type="university" />
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Employees</p>
            <p className="text-3xl font-bold text-gray-900">{stats.employeeCount.toLocaleString()}</p>
          </div>
          <StatIcon type="employees" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Subjects</p>
            <p className="text-3xl font-bold text-gray-900">{stats.subjectCount}</p>
          </div>
          <StatIcon type="subjects" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Vacant Seats</p>
            <p className="text-3xl font-bold text-gray-900">{stats.vacantSeats.toLocaleString()}</p>
          </div>
          <StatIcon type="vacant" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Designations</p>
            <p className="text-3xl font-bold text-gray-900">{stats.designationCount}</p>
          </div>
          <StatIcon type="designations" />
        </div>
      </div>

      {/* Employee Distribution by Designation Across Universities */}
      <ChartCard
        title="Employee Distribution by Designation Across Universities"
        tableData={{
          headers: ['Category', ...desigList],
          rows: data.designationByUniversity.map(row => [row.university, ...desigList.map(d => row[d] || 0)]),
        }}
      >
        {(() => {
          // Custom tick that wraps long university names into multiple lines at an angle
          const WrappedTick = ({ x, y, payload }: any) => {
            const name: string = payload.value || '';
            const words = name.split(' ');
            const lines: string[] = [];
            let cur = '';
            for (const w of words) {
              if ((cur + ' ' + w).trim().length > 14) { lines.push(cur.trim()); cur = w; }
              else cur = (cur + ' ' + w).trim();
            }
            if (cur) lines.push(cur);
            return (
              <g transform={`translate(${x},${y + 6})`}>
                <text transform="rotate(-40)" textAnchor="end" fontSize={11} fill="#374151">
                  {lines.map((line, i) => (
                    <tspan key={i} x={0} dy={i === 0 ? 0 : 13}>{line}</tspan>
                  ))}
                </text>
              </g>
            );
          };
          return (
            <ResponsiveContainer width="100%" height={460}>
              <BarChart data={data.designationByUniversity} margin={{ top: 20, right: 30, left: 20, bottom: 10 }} barCategoryGap="15%" onMouseLeave={() => { legendHover.current = false; setHoveredKey(null); }} onMouseMove={chartMouseMove}>
                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                <XAxis dataKey="university" interval={0} height={140} tick={<WrappedTick />} />
                <YAxis label={{ value: 'Employee Count', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip content={<HoverOnlyTooltip hoveredKey={hoveredKey} />} />
                <Legend
                  iconType="circle" iconSize={10}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value: string) => <span style={{ color: '#374151', opacity: !hoveredKey ? 1 : hoveredKey === value ? 1 : 0.3 }}>{value}</span>}
                  onMouseEnter={(e: any) => onLegendEnter(e)} onMouseLeave={onLegendLeave}
                />
                {desigList.map((d, i) => (
                  <Bar key={d} dataKey={d} stackId="a" fill={getDesigColor(d, i)} fillOpacity={!hoveredKey ? 1 : hoveredKey === d ? 1 : 0.15} onMouseEnter={() => setHoveredKey(d)} stroke="#fff" strokeWidth={2} radius={i === desigList.length - 1 ? [4, 4, 0, 0] : undefined} label={i === desigList.length - 1 ? renderBarLabel : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          );
        })()}
      </ChartCard>

      {/* Hierarchy View / Summary Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('hierarchy')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'hierarchy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Hierarchy View
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Summary Chart
            </button>
          </div>
          <div className="flex gap-3">
            {!isUniAdmin && (
              <select
                value={selectedUni}
                onChange={(e) => { setSelectedUni(e.target.value); setSubjectFilter(''); setDrillSubject(null); setDrillDesig(null); }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="all">All Universities</option>
                {data.universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            )}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">Filter Subjects</option>
              {uniSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {activeTab === 'hierarchy' ? (
          <div style={{ clipPath: 'inset(0)' }}>
            {/* Remove focus outlines from SVG pie segments */}
            <style>{`.recharts-sector, .recharts-pie-sector path, .recharts-surface path { outline: none !important; } .recharts-sector:focus, .recharts-pie-sector:focus { outline: none !important; }`}</style>
            <h4 className="font-bold text-gray-800 text-center mb-2">
              Employee Breakdown - {selectedUniName}
            </h4>

            {/* Drill-down breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm mb-3 ml-2 flex-wrap">
              <button onClick={() => { setDrillSubject(null); setDrillDesig(null); }} className={`font-medium ${!drillSubject ? 'text-gray-800' : 'text-blue-600 hover:underline'}`}>
                {selectedUniName || 'All'}
              </button>
              {drillSubject && (
                <>
                  <span className="text-gray-400">/</span>
                  <button onClick={() => { setDrillDesig(null); }} className={`font-medium ${!drillDesig ? 'text-gray-800' : 'text-blue-600 hover:underline'}`}>
                    {drillSubject}
                  </button>
                </>
              )}
              {drillDesig && (
                <>
                  <span className="text-gray-400">/</span>
                  <span className="font-bold text-gray-800">{drillDesig}</span>
                </>
              )}
            </div>

            {(() => {
              // Build drill-down data based on current level
              let subjects = activeSubjects;
              if (subjectFilter) subjects = subjects.filter((s) => s.name === subjectFilter);

              if (!drillSubject) {
                // Level 0: show all subjects → designations → post types (3 rings)
                return sunburstData.ring1.length === 0 ? (
                  <p className="text-center text-gray-400 py-16">No employee data</p>
                ) : (
                  <>
                    <div className="flex justify-center overflow-hidden" style={{ position: 'relative' }}>
                      {/* Center university name overlay */}
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, pointerEvents: 'none' }}>
                        <div style={{ width: 130, height: 130, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, textAlign: 'center', lineHeight: 1.3 }}>{selectedUniName}</span>
                        </div>
                      </div>
                      <PieChart width={680} height={680}>
                        {/* Ring 1: Subjects */}
                        <Pie data={sunburstData.ring1} cx={340} cy={340} innerRadius={80} outerRadius={140} dataKey="value" label={labelRing1} labelLine={false}
                          onClick={(_: any, idx: number) => { setDrillSubject(sunburstData.ring1[idx]?.name); setDrillDesig(null); }}
                          style={{ cursor: 'pointer', outline: 'none' }}
                        >
                          {sunburstData.ring1.map((e, i) => <Cell key={i} fill={e.fill} stroke="#fff" strokeWidth={1} style={{ outline: 'none' }} tabIndex={-1} />)}
                        </Pie>
                        {/* Ring 2: Designations */}
                        <Pie data={sunburstData.ring2} cx={340} cy={340} innerRadius={145} outerRadius={210} dataKey="value" label={labelRing2} labelLine={false} style={{ outline: 'none' }}>
                          {sunburstData.ring2.map((e, i) => <Cell key={i} fill={e.fill} stroke="#fff" strokeWidth={1} style={{ outline: 'none' }} tabIndex={-1} />)}
                        </Pie>
                        {/* Ring 3: Post Types */}
                        <Pie data={sunburstData.ring3} cx={340} cy={340} innerRadius={215} outerRadius={300} dataKey="value" label={labelRing3} labelLine={false} style={{ outline: 'none' }}>
                          {sunburstData.ring3.map((e, i) => <Cell key={i} fill={e.fill} stroke="#fff" strokeWidth={1} style={{ outline: 'none' }} tabIndex={-1} />)}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [value, name]} />
                      </PieChart>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-xs">
                      <span className="font-semibold text-gray-600">Center: University</span>
                      <span className="font-semibold text-gray-600">Ring 1: Subjects</span>
                      <span className="font-semibold text-gray-600">Ring 2: Designations</span>
                      <span className="font-semibold text-gray-600">Ring 3: Post Types</span>
                      <span className="text-gray-400 italic">Click a subject to drill down</span>
                    </div>
                  </>
                );
              }

              // Find the drilled subject data
              const subj = subjects.find((s) => s.name === drillSubject);
              if (!subj) return <p className="text-center text-gray-400 py-16">No data for {drillSubject}</p>;

              if (!drillDesig) {
                // Level 1: drilled into a subject — show subject center, designations ring, post types ring
                const centerLabel = drillSubject;
                const desigData = subj.children.map((d, i) => ({
                  name: d.name, value: d.children.reduce((s, pt) => s + pt.value, 0), fill: getDesigColor(d.name, i),
                }));
                const ptData = subj.children.flatMap((d, di) =>
                  d.children.map((pt) => ({ name: PT_LABELS[pt.name] || pt.name, value: pt.value, fill: PT_COLORS[pt.name] || RING_COLORS[di] }))
                );
                const drillLabel1 = makePieLabel(0.02, 16, 11);
                const drillLabel2 = makePieLabel(0.02, 12, 10);
                return (
                  <>
                    <div className="flex justify-center overflow-hidden" style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, pointerEvents: 'none' }}>
                        <div style={{ width: 140, height: 140, borderRadius: '50%', background: RING_COLORS[subjects.indexOf(subj) % RING_COLORS.length] || '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, textAlign: 'center', lineHeight: 1.3 }}>{centerLabel}</span>
                        </div>
                      </div>
                      <PieChart width={680} height={680}>
                        <Pie data={desigData} cx={340} cy={340} innerRadius={85} outerRadius={190} dataKey="value" label={drillLabel1} labelLine={false}
                          onClick={(_: any, idx: number) => setDrillDesig(desigData[idx]?.name)}
                          style={{ cursor: 'pointer', outline: 'none' }}
                        >
                          {desigData.map((e, i) => <Cell key={i} fill={e.fill} stroke="#fff" strokeWidth={2} style={{ outline: 'none' }} />)}
                        </Pie>
                        <Pie data={ptData} cx={340} cy={340} innerRadius={195} outerRadius={300} dataKey="value" label={drillLabel2} labelLine={false}>
                          {ptData.map((e, i) => <Cell key={i} fill={e.fill} stroke="#fff" strokeWidth={1} style={{ outline: 'none' }} />)}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [value, name]} />
                      </PieChart>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-xs">
                      <span className="font-semibold text-gray-600">Inner: Designations</span>
                      <span className="font-semibold text-gray-600">Outer: Post Types</span>
                      <span className="text-gray-400 italic">Click a designation to drill deeper</span>
                    </div>
                  </>
                );
              }

              // Level 2: drilled into a designation — show designation center, post types ring
              const desig = subj.children.find((d) => d.name === drillDesig);
              if (!desig) return <p className="text-center text-gray-400 py-16">No data for {drillDesig}</p>;
              const ptData = desig.children.map((pt, i) => ({
                name: PT_LABELS[pt.name] || pt.name, value: pt.value, fill: PT_COLORS[pt.name] || RING_COLORS[i],
              }));
              const drillLabel3 = makePieLabel(0.01, 14, 12);
              return (
                <>
                  <div className="flex justify-center overflow-hidden" style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, pointerEvents: 'none' }}>
                      <div style={{ width: 180, height: 180, borderRadius: '50%', background: getDesigColor(drillDesig!, 0), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 15 }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, textAlign: 'center', lineHeight: 1.3 }}>{drillDesig}</span>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 }}>{drillSubject}</span>
                      </div>
                    </div>
                    <PieChart width={680} height={680}>
                      <Pie data={ptData} cx={340} cy={340} innerRadius={110} outerRadius={300} dataKey="value" label={drillLabel3} labelLine={false}>
                        {ptData.map((e, i) => <Cell key={i} fill={e.fill} stroke="#fff" strokeWidth={2} style={{ outline: 'none' }} />)}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [value, name]} />
                    </PieChart>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-xs">
                    <span className="font-semibold text-gray-600">Post Types</span>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div>
            <h4 className="font-bold text-gray-800 text-center mb-2">
              Summary - {selectedUniName}
            </h4>
            {(() => {
              let subjects = activeSubjects;
              if (subjectFilter) subjects = subjects.filter((s) => s.name === subjectFilter);
              if (subjects.length === 0) return <p className="text-center text-gray-400 py-16">No data</p>;
              const barData = subjects.map((s) => {
                const entry: Record<string, any> = { subject: s.name };
                s.children.forEach((d) => {
                  entry[d.name] = d.children.reduce((sum, pt) => sum + pt.value, 0);
                });
                return entry;
              });
              const desigs = [...new Set(subjects.flatMap((s) => s.children.map((d) => d.name)))];
              const chartWidth = isAllUni ? Math.max(900, subjects.length * 50) : undefined;
              return (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ width: chartWidth || '100%', minWidth: '100%' }}>
                    <ResponsiveContainer width="100%" height={450}>
                      <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }} barSize={20} onMouseLeave={() => { legendHover.current = false; setHoveredKey(null); }} onMouseMove={chartMouseMove}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="subject" angle={-35} textAnchor="end" fontSize={isAllUni ? 9 : 10} interval={0} height={100} />
                        <YAxis />
                        <Tooltip content={<HoverOnlyTooltip hoveredKey={hoveredKey} />} />
                        <Legend onMouseEnter={(e: any) => onLegendEnter(e)} onMouseLeave={onLegendLeave} />
                        {desigs.map((d, i) => (
                          <Bar key={d} dataKey={d} stackId="a" fill={getDesigColor(d, i)} fillOpacity={!hoveredKey ? 1 : hoveredKey === d ? 1 : 0.15} onMouseEnter={() => setHoveredKey(d)} stroke="#fff" strokeWidth={1} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* University-specific charts section */}
      {!isAllUni && uniData && (() => {
        const ud = uniData;
        const udDesigs = ud.designations || [];
        const udSanctionKeys = [...new Set(ud.sanctionVsPresent.flatMap(r => Object.keys(r).filter(k => k !== 'subject')))].sort();

        return (
          <>
            {/* Section header */}
            <div className="flex items-center gap-3 mt-2">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-sm font-semibold text-gray-500 px-3">
                {selectedUniName} — Detailed Analysis
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Category-wise & Employment Type */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                title="Category-wise Designation Distribution"
                tableData={{
                  headers: ['Category', ...udDesigs],
                  rows: ud.categoryDesignation.map(row => [row.category, ...udDesigs.map(d => row[d] || 0)]),
                }}
              >
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={ud.categoryDesignation} margin={{ top: 10, right: 20, left: 10, bottom: 50 }} barSize={40} onMouseLeave={() => { legendHover.current = false; setHoveredKey(null); }} onMouseMove={chartMouseMove}>
                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                    <XAxis dataKey="category" fontSize={12} fontWeight={500} height={50}
                      label={{ value: 'Category', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#6B7280' }} />
                    <YAxis label={{ value: 'Employee Count', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                    <Tooltip content={<HoverOnlyTooltip hoveredKey={hoveredKey} />} />
                    <Legend
                      iconType="circle" iconSize={10}
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      formatter={(value: string) => <span style={{ color: '#374151', opacity: !hoveredKey ? 1 : hoveredKey === value ? 1 : 0.3 }}>{value}</span>}
                      onMouseEnter={(e: any) => onLegendEnter(e)} onMouseLeave={onLegendLeave}
                    />
                    {udDesigs.map((d, i) => (
                      <Bar key={d} dataKey={d} stackId="a" fill={getDesigColor(d, i)} fillOpacity={!hoveredKey ? 1 : hoveredKey === d ? 1 : 0.15} onMouseEnter={() => setHoveredKey(d)} stroke="#fff" strokeWidth={2} radius={i === udDesigs.length - 1 ? [4, 4, 0, 0] : undefined} label={i === udDesigs.length - 1 ? renderBarLabel : undefined} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Employment Type &rarr; Designation Distribution"
                tableData={{
                  headers: ['Employment Type', ...udDesigs],
                  rows: ud.postTypeDesignation.map(row => [PT_LABELS[row.postType] || row.postType, ...udDesigs.map(d => row[d] || 0)]),
                }}
              >
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart
                    data={ud.postTypeDesignation.map((row) => ({ ...row, postType: PT_LABELS[row.postType] || row.postType }))}
                    margin={{ top: 10, right: 20, left: 10, bottom: 50 }}
                    barSize={40}
                    onMouseLeave={() => setHoveredKey(null)}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                    <XAxis dataKey="postType" fontSize={12} fontWeight={500} height={50}
                      label={{ value: 'Employment Type', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#6B7280' }} />
                    <YAxis label={{ value: 'Employee Count', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                    <Tooltip content={<HoverOnlyTooltip hoveredKey={hoveredKey} />} />
                    <Legend
                      iconType="circle" iconSize={10}
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      formatter={(value: string) => <span style={{ color: '#374151', opacity: !hoveredKey ? 1 : hoveredKey === value ? 1 : 0.3 }}>{value}</span>}
                      onMouseEnter={(e: any) => onLegendEnter(e)} onMouseLeave={onLegendLeave}
                    />
                    {udDesigs.map((d, i) => (
                      <Bar key={d} dataKey={d} stackId="a" fill={getDesigColor(d, i)} fillOpacity={!hoveredKey ? 1 : hoveredKey === d ? 1 : 0.15} onMouseEnter={() => setHoveredKey(d)} stroke="#fff" strokeWidth={2} radius={i === udDesigs.length - 1 ? [4, 4, 0, 0] : undefined} label={i === udDesigs.length - 1 ? renderBarLabel : undefined} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Gender & Sanction */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                title="Gender & Designation Distribution"
                tableData={{
                  headers: ['Gender', ...udDesigs, 'Total'],
                  rows: ud.genderDesignation.map(g => [
                    g.gender === 'MALE' ? 'Male' : g.gender === 'FEMALE' ? 'Female' : 'Other',
                    ...udDesigs.map(d => g.designations.find(x => x.name === d)?.value || 0),
                    g.total,
                  ]),
                }}
              >
                {(() => {
                  const innerData = ud.genderDesignation.map((g) => ({
                    name: g.gender === 'MALE' ? 'Male' : g.gender === 'FEMALE' ? 'Female' : 'Other',
                    value: g.total,
                    genderKey: g.gender,
                  }));
                  const outerData = ud.genderDesignation.flatMap((g) =>
                    g.designations.map((d) => ({
                      name: d.name, value: d.value, gender: g.gender,
                      genderLabel: g.gender === 'MALE' ? 'Male' : g.gender === 'FEMALE' ? 'Female' : 'Other',
                    }))
                  );
                  // Monochromatic blue/purple scheme — Male=dark, Female=light
                  const maleColors: Record<string, string> = { 'Senior Professor': '#1E3A8A', 'Associate Professor': '#4338CA', 'Professor': '#2563EB', 'Assistant Professor': '#3730A3' };
                  const femaleColors: Record<string, string> = { 'Senior Professor': '#60A5FA', 'Associate Professor': '#A78BFA', 'Professor': '#93C5FD', 'Assistant Professor': '#818CF8' };
                  const genderFill: Record<string, string> = { MALE: '#312E81', FEMALE: '#6366F1' };
                  const getSegColor = (desig: string, gender: string) => gender === 'MALE' ? (maleColors[desig] || '#1E3A8A') : (femaleColors[desig] || '#93C5FD');
                  const totalAll = innerData.reduce((s, g) => s + g.value, 0);
                  // Hover logic
                  const isGenderHover = hoveredKey === 'Male' || hoveredKey === 'Female' || hoveredKey === 'Other';
                  const isDesigHover = hoveredKey && !isGenderHover;
                  const innerOp = (gLabel: string) => {
                    if (!hoveredKey) return 1;
                    if (isGenderHover) return hoveredKey === gLabel ? 1 : 0.2;
                    return 0.7;
                  };
                  const outerOp = (desig: string, gLabel: string) => {
                    if (!hoveredKey) return 1;
                    if (isGenderHover) return hoveredKey === gLabel ? 1 : 0.12;
                    return hoveredKey === desig ? 1 : 0.12; // designation hover: highlight SAME desig across BOTH genders
                  };
                  const lblOp = (name: string, isInner: boolean) => {
                    if (!hoveredKey) return 1;
                    if (isInner) return isGenderHover ? (hoveredKey === name ? 1 : 0.25) : 0.6;
                    return isDesigHover ? (hoveredKey === name ? 1 : 0.2) : 0.4;
                  };
                  // Tooltip
                  const GenderTip = ({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const pct = totalAll > 0 ? ((d.value / totalAll) * 100).toFixed(1) : '0';
                    const label = d.genderLabel ? d.name : d.name;
                    return (
                      <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3">
                        <p className="text-xs text-gray-500">{d.genderLabel || label}</p>
                        <p className="text-base font-bold">{label}: {d.value} ({pct}%)</p>
                      </div>
                    );
                  };
                  return (
                    <PieChart width={520} height={440} onMouseLeave={() => setHoveredKey(null)} style={{ margin: '0 auto' }}>
                      {/* Inner: Gender — labels INSIDE */}
                      <Pie data={innerData} cx={260} cy={210} innerRadius={35} outerRadius={70} dataKey="value"
                        label={({ cx, cy, midAngle, innerRadius: ir, outerRadius: or, name }) => {
                          const R = Math.PI / 180;
                          const radius = ir + (or - ir) / 2;
                          const x = cx + radius * Math.cos(-midAngle * R);
                          const y = cy + radius * Math.sin(-midAngle * R);
                          return <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={700} fill="#fff" opacity={lblOp(name, true)}>{name}</text>;
                        }}
                        labelLine={false}
                      >
                        {innerData.map((e, i) => (
                          <Cell key={i} fill={genderFill[e.genderKey] || '#6B7280'} fillOpacity={innerOp(e.name)} stroke="#fff" strokeWidth={2} onMouseEnter={() => setHoveredKey(e.name)} style={{ cursor: 'pointer', outline: 'none' }} />
                        ))}
                      </Pie>
                      {/* Outer: Designations — labels outside */}
                      <Pie data={outerData} cx={260} cy={210} innerRadius={78} outerRadius={130} dataKey="value"
                        label={({ cx, cy, midAngle, outerRadius: or, name, percent }) => {
                          if (percent < 0.03) return null;
                          const R = Math.PI / 180;
                          const x = cx + (or + 14) * Math.cos(-midAngle * R);
                          const y = cy + (or + 14) * Math.sin(-midAngle * R);
                          return <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight={600} fill="#374151" opacity={lblOp(name, false)}>{name}</text>;
                        }}
                        labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                      >
                        {outerData.map((e, i) => (
                          <Cell key={i} fill={getSegColor(e.name, e.gender)} fillOpacity={outerOp(e.name, e.genderLabel)} stroke="#fff" strokeWidth={2} onMouseEnter={() => setHoveredKey(e.name)} style={{ cursor: 'pointer', outline: 'none' }} />
                        ))}
                      </Pie>
                      <Tooltip content={<GenderTip />} />
                    </PieChart>
                  );
                })()}
              </ChartCard>

              {(() => {
                const sanctionBarKeys = udSanctionKeys.filter(k => k.startsWith('Sanction'));
                const presentBarKeys = udSanctionKeys.filter(k => k.startsWith('Present'));
                const chartData = ud.sanctionVsPresent.map(row => {
                  const sTotal = sanctionBarKeys.reduce((s, k) => s + (Number(row[k]) || 0), 0);
                  const pTotal = presentBarKeys.reduce((s, k) => s + (Number(row[k]) || 0), 0);
                  return { ...row, _sTotal: sTotal, _pTotal: pTotal };
                });
                const allColors: Record<string, string> = {
                  'Sanction - Senior Professor': '#1E3A8A', 'Sanction - Associate Professor': '#6D28D9',
                  'Sanction - Professor': '#166534', 'Sanction - Assistant Professor': '#92400E',
                  'Present - Senior Professor': '#93C5FD', 'Present - Associate Professor': '#DDD6FE',
                  'Present - Professor': '#BBF7D0', 'Present - Assistant Professor': '#FDE68A',
                };
                const getOpacity = (key: string) => !hoveredKey ? 1 : hoveredKey === key ? 1 : 0.15;
                // Custom label for stack totals
                const SanctionTotalLabel = ({ x, y, width, index }: any) => {
                  const val = chartData[index]?._sTotal;
                  return val ? <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#1E3A8A">{val}</text> : <text />;
                };
                const PresentTotalLabel = ({ x, y, width, index }: any) => {
                  const val = chartData[index]?._pTotal;
                  return val ? <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#6B7280">{val}</text> : <text />;
                };
                // Custom tooltip
                const SanctionTooltip = ({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  const row = chartData.find((r: any) => r.subject === label);
                  if (!row) return null;
                  const sTotal = row._sTotal; const pTotal = row._pTotal;
                  return (
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px]">
                      <p className="font-bold text-lg text-center">{payload[0]?.value}</p>
                      <p className="text-gray-500 text-center text-sm mb-2">Total: {sTotal + pTotal}</p>
                      <hr className="mb-2" />
                      {payload.map((p: any) => (
                        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-sm py-0.5">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.fill }} />
                            {p.dataKey}
                          </span>
                          <span className="font-semibold">{p.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                };
                return (
                  <ChartCard
                    title="Sanction vs Present (Designation-wise)"
                    tableData={{
                      headers: ['Subject', ...udSanctionKeys],
                      rows: ud.sanctionVsPresent.map(row => [row.subject, ...udSanctionKeys.map(k => row[k] || 0)]),
                    }}
                  >
                    <ResponsiveContainer width="100%" height={480}>
                      <BarChart data={chartData} margin={{ top: 25, right: 15, left: 10, bottom: 80 }} barGap={2} barCategoryGap="15%" barSize={20}
                        onMouseLeave={() => { legendHover.current = false; setHoveredKey(null); }} onMouseMove={chartMouseMove}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="subject" angle={-40} textAnchor="end" fontSize={9} interval={0} height={90}
                          label={{ value: 'Subjects', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#6B7280' }} />
                        <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                        <Tooltip content={({ active, payload, label }: any) => {
                          if (!active || !payload?.length || !hoveredKey) return null;
                          // Extract designation name from hoveredKey (e.g. "Sanction - Assistant Professor" → "Assistant Professor")
                          const desigName = hoveredKey.replace(/^(Sanction|Present)\s*-\s*/, '');
                          const sanctionKey = `Sanction - ${desigName}`;
                          const presentKey = `Present - ${desigName}`;
                          const sItem = payload.find((p: any) => p.dataKey === sanctionKey);
                          const pItem = payload.find((p: any) => p.dataKey === presentKey);
                          const sVal = sItem?.value || 0;
                          const pVal = pItem?.value || 0;
                          const total = sVal + pVal;
                          const hoveredVal = payload.find((p: any) => p.dataKey === hoveredKey)?.value || 0;
                          return (
                            <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-5 py-4 min-w-[220px]">
                              <p className="text-3xl font-bold text-center text-gray-800">{hoveredVal}</p>
                              <p className="text-sm text-gray-500 text-center mb-3">Total: {total}</p>
                              <hr className="mb-3" />
                              <div className="flex items-center justify-between gap-4 text-sm py-1">
                                <span className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: pItem?.fill || allColors[presentKey] || '#FCD34D' }} />
                                  Present - {desigName}
                                </span>
                                <span className="font-semibold">{pVal}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-sm py-1">
                                <span className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: sItem?.fill || allColors[sanctionKey] || '#1E3A8A' }} />
                                  Sanction - {desigName}
                                </span>
                                <span className="font-semibold">{sVal}</span>
                              </div>
                            </div>
                          );
                        }} />
                        <Legend content={() => {
                          // Extract unique designation names
                          const desigNames = [...new Set(sanctionBarKeys.map(k => k.replace('Sanction - ', '')))];
                          return (
                            <div className="flex justify-center mt-3">
                              <div className="grid grid-cols-2 gap-x-10 gap-y-1.5 text-sm">
                                {desigNames.map((d) => {
                                  const sKey = `Sanction - ${d}`;
                                  const pKey = `Present - ${d}`;
                                  return (
                                    <React.Fragment key={d}>
                                      <div className="flex items-center gap-2 cursor-pointer" style={{ opacity: getOpacity(sKey) }}
                                        onMouseEnter={() => onLegendEnter(sKey)} onMouseLeave={onLegendLeave}>
                                        <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ background: allColors[sKey] || '#666' }} />
                                        <span className="text-gray-700">Sanction - {d}</span>
                                      </div>
                                      <div className="flex items-center gap-2 cursor-pointer" style={{ opacity: getOpacity(pKey) }}
                                        onMouseEnter={() => onLegendEnter(pKey)} onMouseLeave={onLegendLeave}>
                                        <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ background: allColors[pKey] || '#999' }} />
                                        <span className="text-gray-700">Present - {d}</span>
                                      </div>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }} />
                        {sanctionBarKeys.map((k, i) => (
                          <Bar key={k} dataKey={k} stackId="sanction"
                            fill={allColors[k] || RING_COLORS[i]}
                            fillOpacity={getOpacity(k)}
                            onMouseEnter={() => setHoveredKey(k)}
                            stroke="#fff" strokeWidth={1}
                            label={i === sanctionBarKeys.length - 1 ? SanctionTotalLabel : undefined}
                          />
                        ))}
                        {presentBarKeys.map((k, i) => (
                          <Bar key={k} dataKey={k} stackId="present"
                            fill={allColors[k] || RING_COLORS[(i + 4)]}
                            fillOpacity={getOpacity(k)}
                            onMouseEnter={() => setHoveredKey(k)}
                            stroke="#fff" strokeWidth={1}
                            label={i === presentBarKeys.length - 1 ? PresentTotalLabel : undefined}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                );
              })()}
            </div>
          </>
        );
      })()}
    </div>
  );
}
