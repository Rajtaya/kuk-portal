'use client';

import { EmptyState } from './empty-state';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
}

export default function DataTable<T extends Record<string, any>>({
  columns, data, page, totalPages, total, onPageChange, onRowClick, emptyState,
}: DataTableProps<T>) {
  const isEmpty = data.length === 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {isEmpty ? (
        emptyState ?? <EmptyState title="No records found" description="There's nothing to show here yet." />
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                  {columns.map((col) => (
                    <th key={col.key} className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={row.id || i}
                    onClick={() => onRowClick?.(row)}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-gray-900 dark:text-gray-200">
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((row, i) => (
              <div
                key={row.id || i}
                onClick={() => onRowClick?.(row)}
                className={`p-4 ${onRowClick ? 'active:bg-gray-50 dark:active:bg-gray-800/50' : ''}`}
              >
                {columns.map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-3 py-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">{col.label}</span>
                    <span className="text-sm text-gray-900 dark:text-gray-200 text-right">
                      {col.render ? col.render(row) : row[col.key]}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {data.length} of {total} records
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-white dark:hover:bg-gray-800 dark:text-gray-300 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-white dark:hover:bg-gray-800 dark:text-gray-300 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
