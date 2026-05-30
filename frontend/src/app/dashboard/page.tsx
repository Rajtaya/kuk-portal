'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { DashboardStats } from '@/lib/types';
import StatCard from '@/components/ui/stat-card';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get<DashboardStats>('/employees/dashboard-stats').then(setStats);
  }, []);

  if (!stats) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>;
  }

  const isUniAdmin = user?.role === 'UNIVERSITY_ADMIN';

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">
          {isUniAdmin ? `${user?.university?.name || 'University'} overview` : 'State-level overview'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {!isUniAdmin && stats.universityCount !== undefined && (
          <StatCard title="Total Universities" value={stats.universityCount} color="orange" />
        )}
        <StatCard title="Total Employees" value={stats.total} color="orange" />
        <StatCard title="Active Employees" value={stats.active} color="green" />
        <StatCard title="Teaching Staff" value={stats.teaching} color="amber" />
        <StatCard title="Non-Teaching Staff" value={stats.nonTeaching} color="amber" />
        <StatCard title="Sanctioned Posts" value={stats.sanctioned} color="orange" />
        <StatCard title="Filled Posts" value={stats.filled} color="green" />
        <StatCard title="Vacancies" value={stats.vacancies} color="red" />
        <StatCard title="Retiring This Year" value={stats.retiringThisYear} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Post Type Distribution</h3>
          <div className="space-y-3">
            {[
              { label: 'Budgeted', value: stats.budgeted, color: 'bg-orange-500' },
              { label: 'SFS', value: stats.sfs, color: 'bg-amber-500' },
              { label: 'Contractual', value: stats.contractual, color: 'bg-red-400' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all`}
                    style={{ width: `${stats.active ? (item.value / stats.active) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Gender Distribution</h3>
          <div className="flex items-center justify-center h-40">
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-4xl font-bold text-orange-600">{stats.gender.male}</p>
                <p className="text-sm text-gray-500 mt-1">Male</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-4xl font-bold text-amber-600">{stats.gender.female}</p>
                <p className="text-sm text-gray-500 mt-1">Female</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Vacancy Analysis</h3>
          <div className="flex items-center justify-center h-40">
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{stats.sanctioned}</p>
                <p className="text-xs text-gray-500 mt-1">Sanctioned</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{stats.filled}</p>
                <p className="text-xs text-gray-500 mt-1">Filled</p>
              </div>
              <div className="w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{stats.vacancies}</p>
                <p className="text-xs text-gray-500 mt-1">Vacant</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
