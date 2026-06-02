'use client';

import { useState } from 'react';

interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface FilterBarProps {
  filters: FilterOption[];
  searchPlaceholder?: string;
  onFilter: (filters: Record<string, string>) => void;
}

export default function FilterBar({ filters, searchPlaceholder = 'Search...', onFilter }: FilterBarProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  function handleChange(key: string, value: string) {
    const next = { ...values, [key]: value };
    if (!value) delete next[key];
    setValues(next);
    onFilter({ ...next, search });
  }

  function handleSearch(value: string) {
    setSearch(value);
    onFilter({ ...values, search: value });
  }

  function handleReset() {
    setValues({});
    setSearch('');
    onFilter({});
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
        />

        {filters.map((filter) => (
          <select
            key={filter.key}
            value={values[filter.key] || ''}
            onChange={(e) => handleChange(filter.key, e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{filter.label}</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ))}

        <button
          onClick={handleReset}
          className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
