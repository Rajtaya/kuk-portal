'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useDarkMode } from '@/lib/dark-mode-context';
import { Search, LayoutDashboard, Users, Building2, ClipboardList, FileText, UserCog, Settings, Moon, Sun, LogOut } from 'lucide-react';

interface Command {
  id: string;
  label: string;
  section: string;
  icon: React.ReactNode;
  keywords?: string;
  run: () => void;
}

const navByRole: Record<string, string[]> = {
  SUPER_ADMIN: ['dashboard', 'employees', 'universities', 'sanctioned', 'reports', 'users', 'settings'],
  STATE_USER: ['dashboard', 'employees', 'universities', 'reports'],
  UNIVERSITY_ADMIN: ['dashboard', 'employees', 'sanctioned', 'reports'],
};

export function CommandPalette() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => { setOpen(false); router.push(href); };
    const nav: Record<string, Command> = {
      dashboard:    { id: 'dashboard', label: 'Dashboard', section: 'Go to', icon: <LayoutDashboard className="w-4 h-4" />, run: go('/dashboard') },
      employees:    { id: 'employees', label: 'Employees', section: 'Go to', icon: <Users className="w-4 h-4" />, run: go('/employees') },
      universities: { id: 'universities', label: 'Universities', section: 'Go to', icon: <Building2 className="w-4 h-4" />, run: go('/universities') },
      sanctioned:   { id: 'sanctioned', label: 'Sanctioned Posts', section: 'Go to', icon: <ClipboardList className="w-4 h-4" />, keywords: 'posts vacancy', run: go('/sanctioned-posts') },
      reports:      { id: 'reports', label: 'Reports', section: 'Go to', icon: <FileText className="w-4 h-4" />, run: go('/reports') },
      users:        { id: 'users', label: 'Users', section: 'Go to', icon: <UserCog className="w-4 h-4" />, run: go('/users') },
      settings:     { id: 'settings', label: 'Settings', section: 'Go to', icon: <Settings className="w-4 h-4" />, run: go('/settings') },
    };
    const allowed = navByRole[user?.role || 'UNIVERSITY_ADMIN'] || [];
    const list = allowed.map((k) => nav[k]).filter(Boolean);

    list.push({
      id: 'toggle-theme',
      label: isDark ? 'Switch to light mode' : 'Switch to dark mode',
      section: 'Actions',
      icon: isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      keywords: 'dark light theme',
      run: () => { toggle(); setOpen(false); },
    });
    if (user) {
      list.push({
        id: 'logout',
        label: 'Sign out',
        section: 'Actions',
        icon: <LogOut className="w-4 h-4" />,
        run: () => { setOpen(false); logout(); },
      });
    }
    return list;
  }, [user, isDark, router, toggle, logout]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords || ''}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => { setSelected(0); }, [query, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[selected]?.run(); }
  };

  let lastSection = '';

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4" onMouseDown={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onListKey}
            placeholder="Search pages and actions…"
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm"
          />
          <kbd className="text-[10px] font-medium text-gray-400 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No results for &ldquo;{query}&rdquo;</div>
          ) : (
            filtered.map((cmd, idx) => {
              const showSection = cmd.section !== lastSection;
              lastSection = cmd.section;
              return (
                <div key={cmd.id}>
                  {showSection && (
                    <div className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{cmd.section}</div>
                  )}
                  <button
                    onMouseEnter={() => setSelected(idx)}
                    onClick={cmd.run}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left ${
                      idx === selected
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className={idx === selected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}>{cmd.icon}</span>
                    <span className="flex-1">{cmd.label}</span>
                    {idx === selected && <span className="text-[10px] text-gray-400">↵</span>}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-[11px] text-gray-400">
          <span>↑↓ navigate &middot; ↵ select</span>
          <span>⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
