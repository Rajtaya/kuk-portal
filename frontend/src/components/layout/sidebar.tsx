'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DarkModeToggle } from '@/components/ui/dark-mode-toggle';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { clsx } from 'clsx';

const navItems = {
  dashboard:    { href: '/dashboard',        label: 'Dashboard',        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4', color: 'from-primary-500 to-primary-600' },
  employees:    { href: '/employees',        label: 'Employees',        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: 'from-emerald-500 to-emerald-600' },
  universities: { href: '/universities',     label: 'Universities',     icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'from-violet-500 to-violet-600' },
  sanctioned:   { href: '/sanctioned-posts', label: 'Sanctioned Posts', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', color: 'from-amber-500 to-amber-600' },
  users:        { href: '/users',            label: 'Users',            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'from-cyan-500 to-cyan-600' },
  settings:     { href: '/settings',         label: 'Settings',         icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', color: 'from-gray-500 to-gray-600' },
};

const roleLinks = {
  SUPER_ADMIN: ['dashboard', 'employees', 'universities', 'sanctioned', 'users', 'settings'],
  STATE_USER: ['dashboard', 'employees', 'universities', 'sanctioned'],
  UNIVERSITY_ADMIN: ['dashboard', 'employees', 'sanctioned', 'settings'],
};

type SidebarMode = 'expanded' | 'collapsed' | 'hidden';

export default function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<SidebarMode>('expanded');

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-mode') as SidebarMode;
    if (saved && ['expanded', 'collapsed', 'hidden'].includes(saved)) setMode(saved);
  }, []);

  const cycleMode = () => {
    setMode((prev) => {
      const next = prev === 'expanded' ? 'collapsed' : prev === 'collapsed' ? 'hidden' : 'expanded';
      localStorage.setItem('sidebar-mode', next);
      return next;
    });
  };

  const show = () => {
    setMode('expanded');
    localStorage.setItem('sidebar-mode', 'expanded');
  };

  const isHidden = mode === 'hidden';
  const isCollapsed = mode === 'collapsed';

  const isDashboard = pathname === '/dashboard';
  const links = (roleLinks[user?.role || 'UNIVERSITY_ADMIN'] || []).map((k) => navItems[k as keyof typeof navItems]);

  const renderNav = (mobile: boolean) => {
    const collapsed = !mobile && isCollapsed;
    return (
      <div className={clsx('flex flex-col h-full transition-opacity duration-200', (!mobile && isHidden) ? 'opacity-0' : 'opacity-100')}>
        <div className={clsx('flex items-center border-b border-white/10 shrink-0', collapsed ? 'p-3 justify-center' : 'p-5 justify-between')}>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-white tracking-tight">UEMS</h1>
              <p className="text-[11px] text-stone-400 mt-0.5 truncate whitespace-nowrap">University Employees Management</p>
            </div>
          )}
          <button
            onClick={mobile ? onMobileClose : cycleMode}
            className="p-2 rounded-lg text-stone-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
            title={mobile ? 'Close menu' : collapsed ? 'Hide sidebar' : 'Collapse sidebar'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              {(mobile || collapsed) ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={mobile ? onMobileClose : undefined}
                title={collapsed ? link.label : undefined}
                className={clsx(
                  'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                  collapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5',
                  isActive
                    ? 'bg-white/15 text-white shadow-lg shadow-black/10'
                    : 'text-stone-400 hover:bg-white/8 hover:text-white hover:translate-x-0.5'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-primary-400 to-primary-600 rounded-r-full" />
                )}
                <span className={clsx(
                  'w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-all group-hover:scale-110',
                  isActive ? `bg-gradient-to-br ${link.color} shadow-md` : 'bg-white/5 group-hover:bg-white/10'
                )}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                  </svg>
                </span>
                {!collapsed && <span className="truncate whitespace-nowrap">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={clsx('border-t border-white/10 shrink-0', collapsed ? 'p-2' : 'p-4')}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-1">
              {!isDashboard && <ThemeToggle variant="sidebar" />}
              {!isDashboard && <DarkModeToggle variant="sidebar" />}
              {!isDashboard && (
                <button onClick={logout} title="Sign Out" className="w-full flex justify-center p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                  <p className="text-[11px] text-stone-400 truncate">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-3">
                {user?.university && (
                  <span className="px-2 py-0.5 bg-primary-500/15 text-primary-300 text-[10px] font-medium rounded-full whitespace-nowrap">{user.university.code}</span>
                )}
                <span className="px-2 py-0.5 bg-white/8 text-stone-400 text-[10px] font-medium rounded-full whitespace-nowrap">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
              {!isDashboard && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={logout}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="whitespace-nowrap">Sign Out</span>
                  </button>
                  <ThemeToggle variant="sidebar" />
                  <DarkModeToggle variant="sidebar" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile: overlay sidebar with backdrop */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileClose} />
          <aside className="fixed inset-y-0 left-0 w-72 z-50 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 sidebar-gradient shadow-2xl md:hidden overflow-y-auto">
            {renderNav(true)}
          </aside>
        </>
      )}

      {/* Desktop: floating show button when hidden */}
      {isHidden && (
        <button
          onClick={show}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-white p-2 pr-3 rounded-r-xl shadow-lg hover:bg-slate-800 transition-all hover:pr-4 group hidden md:block"
          title="Show sidebar"
        >
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Desktop: static sidebar */}
      <aside className={clsx(
        'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 sidebar-gradient h-screen flex-col shrink-0 transition-all duration-300 sticky top-0 overflow-hidden',
        'hidden md:flex',
        isHidden ? 'w-0' : isCollapsed ? 'w-[72px]' : 'w-64'
      )}>
        {renderNav(false)}
      </aside>
    </>
  );
}
