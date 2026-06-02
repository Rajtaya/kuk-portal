'use client';

import { useDarkMode } from '@/lib/dark-mode-context';
import { Moon, Sun } from 'lucide-react';
import { clsx } from 'clsx';

export function DarkModeToggle({ variant = 'bar' }: { variant?: 'bar' | 'sidebar' }) {
  const { isDark, toggle } = useDarkMode();

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle dark mode"
      className={clsx(
        'p-2 rounded-lg transition-colors shrink-0',
        variant === 'sidebar'
          ? 'text-slate-400 hover:bg-white/10 hover:text-white'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
      )}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
