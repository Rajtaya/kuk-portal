'use client';

import { useDarkMode } from '@/lib/dark-mode-context';
import { Moon, Sun } from 'lucide-react';
import { clsx } from 'clsx';

export function DarkModeToggle({ variant = 'bar' }: { variant?: 'bar' | 'sidebar' | 'scopebar' }) {
  const { isDark, toggle } = useDarkMode();

  if (variant === 'scopebar') {
    return (
      <button
        onClick={toggle}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle dark mode"
        className="flex flex-col items-center justify-center px-3 py-1.5 min-w-[72px] bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-[3px_3px_0_0_rgba(28,25,23,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[5px_5px_0_0_rgba(28,25,23,0.55)] focus:outline-none focus:ring-2 focus:ring-white/70"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        <span className="font-mono uppercase tracking-wider text-white/80 text-[9px] mt-1">{isDark ? 'Light' : 'Dark'}</span>
      </button>
    );
  }

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
