'use client';

import { useEffect, useState, useMemo } from 'react';
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
  universities: { id: string; name: string }[];
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

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <h3 className="font-bold text-gray-800 text-center mb-4">{title}</h3>
      {children}
    </div>
  );
}

const renderBarLabel = ({ x, y, width, value }: any) => {
  if (!value) return null;
  return <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="#374151">{value}</text>;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ChartData | null>(null);
  const [selectedUni, setSelectedUni] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'summary'>('hierarchy');
  const [subjectFilter, setSubjectFilter] = useState<string>('');

  useEffect(() => {
    api.get<ChartData>('/employees/dashboard-charts').then((d) => {
      setData(d);
      if (d.hierarchy.length > 0) setSelectedUni(d.hierarchy[0].universityId);
    });
  }, []);

  const isUniAdmin = user?.role === 'UNIVERSITY_ADMIN';

  const desigList = useMemo(() => data?.designations || [], [data]);

  // Sunburst data for selected university
  const sunburstData = useMemo(() => {
    if (!data) return { ring1: [], ring2: [], ring3: [] };
    const uniData = data.hierarchy.find((h) => h.universityId === selectedUni);
    if (!uniData) return { ring1: [], ring2: [], ring3: [] };

    let subjects = uniData.children;
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
  }, [data, selectedUni, subjectFilter]);

  const selectedUniName = useMemo(() => {
    return data?.hierarchy.find((h) => h.universityId === selectedUni)?.universityName || '';
  }, [data, selectedUni]);

  // Subjects available for the selected university
  const uniSubjects = useMemo(() => {
    const uniData = data?.hierarchy.find((h) => h.universityId === selectedUni);
    return uniData?.children.map((c) => c.name).sort() || [];
  }, [data, selectedUni]);

  // All unique sanction/present keys for the grouped bar chart
  const sanctionKeys = useMemo(() => {
    if (!data) return [];
    const keys = new Set<string>();
    data.sanctionVsPresent.forEach((row) => {
      Object.keys(row).forEach((k) => { if (k !== 'subject') keys.add(k); });
    });
    return [...keys].sort();
  }, [data]);

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
    if (percent < 0.04) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) / 2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const display = name.length > 10 ? name.substring(0, 8) + '..' : name;
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={600}>
        {display}
      </text>
    );
  };

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
      <ChartCard title="Employee Distribution by Designation Across Universities">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.designationByUniversity} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="university" angle={-20} textAnchor="end" fontSize={11} interval={0} height={80} />
            <YAxis label={{ value: 'Values', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            {desigList.map((d, i) => (
              <Bar key={d} dataKey={d} stackId="a" fill={getDesigColor(d, i)} />
            ))}
          </BarChart>
        </ResponsiveContainer>
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
                onChange={(e) => { setSelectedUni(e.target.value); setSubjectFilter(''); }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              >
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
            <h4 className="font-bold text-gray-800 text-center mb-2">
              Employee Breakdown - {selectedUniName}
            </h4>
            {sunburstData.ring1.length === 0 ? (
              <p className="text-center text-gray-400 py-16">No employee data for this university</p>
            ) : (
              <div className="flex justify-center overflow-hidden">
                <PieChart width={620} height={620}>
                  {/* Center label */}
                  <text x={310} y={305} textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight={700} fill="#1F2937">
                    {selectedUniName.length > 25 ? selectedUniName.substring(0, 22) + '...' : selectedUniName}
                  </text>
                  <text x={310} y={320} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#6B7280">
                    University
                  </text>
                  {/* Ring 1: Subjects */}
                  <Pie data={sunburstData.ring1} cx={310} cy={310} innerRadius={85} outerRadius={150} dataKey="value" label={renderPieLabel} labelLine={false}>
                    {sunburstData.ring1.map((e, i) => <Cell key={i} fill={e.fill} stroke="#fff" strokeWidth={1} />)}
                  </Pie>
                  {/* Ring 2: Designations */}
                  <Pie data={sunburstData.ring2} cx={310} cy={310} innerRadius={155} outerRadius={215} dataKey="value" label={renderPieLabel} labelLine={false}>
                    {sunburstData.ring2.map((e, i) => <Cell key={i} fill={e.fill} stroke="#fff" strokeWidth={1} />)}
                  </Pie>
                  {/* Ring 3: Post Types */}
                  <Pie data={sunburstData.ring3} cx={310} cy={310} innerRadius={220} outerRadius={280} dataKey="value" label={renderPieLabel} labelLine={false}>
                    {sunburstData.ring3.map((e, i) => <Cell key={i} fill={e.fill} stroke="#fff" strokeWidth={1} />)}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [value, name]} />
                </PieChart>
              </div>
            )}
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-xs">
              <span className="font-semibold text-gray-600">Inner: Subjects</span>
              <span className="font-semibold text-gray-600">Middle: Designations</span>
              <span className="font-semibold text-gray-600">Outer: Post Types</span>
            </div>
          </div>
        ) : (
          <div>
            <h4 className="font-bold text-gray-800 text-center mb-2">
              Summary - {selectedUniName}
            </h4>
            {(() => {
              const uniData = data.hierarchy.find((h) => h.universityId === selectedUni);
              if (!uniData) return <p className="text-center text-gray-400 py-16">No data</p>;
              let subjects = uniData.children;
              if (subjectFilter) subjects = subjects.filter((s) => s.name === subjectFilter);
              const barData = subjects.map((s) => {
                const entry: Record<string, any> = { subject: s.name };
                s.children.forEach((d) => {
                  entry[d.name] = d.children.reduce((sum, pt) => sum + pt.value, 0);
                });
                return entry;
              });
              const desigs = [...new Set(subjects.flatMap((s) => s.children.map((d) => d.name)))];
              return (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" angle={-30} textAnchor="end" fontSize={10} interval={0} height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {desigs.map((d, i) => (
                      <Bar key={d} dataKey={d} stackId="a" fill={getDesigColor(d, i)} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        )}
      </div>

      {/* Category-wise & Employment Type charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Category-wise Designation Distribution">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.categoryDesignation} margin={{ top: 20, right: 20, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" fontSize={11} />
              <YAxis label={{ value: 'Employee Count', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {desigList.map((d, i) => (
                <Bar key={d} dataKey={d} stackId="a" fill={getDesigColor(d, i)} label={i === desigList.length - 1 ? renderBarLabel : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Employment Type &rarr; Designation Distribution">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={data.postTypeDesignation.map((row) => ({
                ...row,
                postType: PT_LABELS[row.postType] || row.postType,
              }))}
              margin={{ top: 20, right: 20, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="postType" fontSize={11} />
              <YAxis label={{ value: 'Employee Count', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {desigList.map((d, i) => (
                <Bar key={d} dataKey={d} stackId="a" fill={getDesigColor(d, i)} label={i === desigList.length - 1 ? renderBarLabel : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Gender & Designation + Sanction vs Present */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Gender & Designation Distribution">
          {(() => {
            const innerData = data.genderDesignation.map((g) => ({
              name: g.gender === 'MALE' ? 'Male' : g.gender === 'FEMALE' ? 'Female' : 'Other',
              value: g.total,
            }));
            const outerData = data.genderDesignation.flatMap((g) =>
              g.designations.map((d) => ({ name: d.name, value: d.value, gender: g.gender }))
            );
            const genderColors: Record<string, string> = { MALE: '#3B82F6', FEMALE: '#8B5CF6', OTHER: '#10B981' };
            return (
              <div className="flex justify-center">
                <PieChart width={400} height={380}>
                  {/* Inner ring: Gender */}
                  <Pie data={innerData} cx={200} cy={180} innerRadius={50} outerRadius={90} dataKey="value" label={({ name }) => name} labelLine>
                    {innerData.map((e, i) => (
                      <Cell key={i} fill={genderColors[data.genderDesignation[i]?.gender] || '#94A3B8'} />
                    ))}
                  </Pie>
                  {/* Outer ring: Designation per gender */}
                  <Pie data={outerData} cx={200} cy={180} innerRadius={100} outerRadius={150} dataKey="value" label={({ name, percent }) => percent > 0.05 ? name : ''} labelLine>
                    {outerData.map((e, i) => (
                      <Cell key={i} fill={getDesigColor(e.name, i)} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </div>
            );
          })()}
        </ChartCard>

        <ChartCard title="Sanction vs Present (Designation-wise)">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={data.sanctionVsPresent} margin={{ top: 20, right: 20, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" angle={-30} textAnchor="end" fontSize={9} interval={0} height={70} />
              <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {sanctionKeys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={SANCTION_COLORS[k] || RING_COLORS[i % RING_COLORS.length]} label={renderBarLabel} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
