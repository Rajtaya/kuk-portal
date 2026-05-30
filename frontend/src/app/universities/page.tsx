'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { University } from '@/lib/types';

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);

  useEffect(() => {
    api.get<University[]>('/universities').then(setUniversities);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Universities</h2>
          <p className="text-gray-500 mt-1">{universities.length} registered universities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {universities.map((uni) => (
          <div key={uni.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{uni.name}</h3>
                <span className="inline-block mt-1 px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full font-medium">
                  {uni.code}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Employees</span>
                <span className="font-medium">{uni._count?.employees || 0}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Departments</span>
                <span className="font-medium">{uni._count?.departments || 0}</span>
              </div>
              {uni.city && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Location</span>
                  <span className="font-medium">{uni.city}, {uni.state}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
