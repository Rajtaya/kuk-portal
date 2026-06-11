'use client';

import { useTheme } from '@/lib/theme-context';
import { Palette } from 'lucide-react';
import { clsx } from 'clsx';

export function ThemeToggle({ variant = 'bar' }: { variant?: 'bar' | 'sidebar' }) {
  const { theme, setTheme } = useTheme();
  const next = theme === 'warm' ? 'blue' : 'warm';

  return (
    <button
      onClick={() => setTheme(next)}
      title={`Switch to ${next === 'warm' ? 'Warm Academic' : 'Classic Blue'} theme`}
      aria-label="Toggle theme"
      className={clsx(
        'p-2 rounded-lg transition-colors shrink-0',
        variant === 'sidebar'
          ? 'text-slate-400 hover:bg-white/10 hover:text-white'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
      )}
    >
      <Palette className="w-5 h-5" />
    </button>
  );
}
