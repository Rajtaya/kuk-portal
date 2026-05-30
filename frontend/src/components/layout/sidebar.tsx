'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { clsx } from 'clsx';

const navItems = {
  dashboard:    { href: '/dashboard',        label: 'Dashboard',        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  employees:    { href: '/employees',        label: 'Employees',        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  universities: { href: '/universities',     label: 'Universities',     icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  sanctioned:   { href: '/sanctioned-posts', label: 'Sanctioned Posts', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  reports:      { href: '/reports',          label: 'Reports',          icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  users:        { href: '/users',            label: 'Users',            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  settings:     { href: '/settings',         label: 'Settings',         icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
};

const roleLinks = {
  SUPER_ADMIN: ['dashboard', 'employees', 'universities', 'sanctioned', 'reports', 'users', 'settings'],
  STATE_USER: ['dashboard', 'employees', 'universities', 'reports'],
  UNIVERSITY_ADMIN: ['dashboard', 'employees', 'sanctioned', 'reports'],
};

export default function Sidebar({ collapsed: controlledCollapsed, onToggle }: { collapsed?: boolean; onToggle?: () => void } = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isControlled = controlledCollapsed !== undefined;
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed;

  useEffect(() => {
    if (!isControlled) {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved === 'true') setInternalCollapsed(true);
    }
  }, [isControlled]);

  const toggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalCollapsed((c) => {
        localStorage.setItem('sidebar-collapsed', String(!c));
        return !c;
      });
    }
  };

  const links = (roleLinks[user?.role || 'UNIVERSITY_ADMIN'] || []).map((k) => navItems[k as keyof typeof navItems]);

  return (
    <aside className={clsx(
      'bg-white border-r border-gray-200 min-h-screen flex flex-col shrink-0 transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header with toggle */}
      <div className={clsx('border-b border-gray-200 flex items-center', collapsed ? 'p-3 justify-center' : 'p-4 justify-between')}>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-primary-700">UEMS</h1>
            <p className="text-xs text-gray-500 mt-0.5 truncate">University Employees Management</p>
          </div>
        )}
        <button
          onClick={toggle}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            title={collapsed ? link.label : undefined}
            className={clsx(
              'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
              pathname.startsWith(link.href)
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
            </svg>
            {!collapsed && <span className="truncate">{link.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User info */}
      <div className={clsx('border-t border-gray-200', collapsed ? 'p-2' : 'p-3')}>
        {collapsed ? (
          <button
            onClick={logout}
            title="Sign Out"
            className="w-full flex justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        ) : (
          <>
            <div className="mb-3">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {user?.university && (
                  <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full">{user.university.code}</span>
                )}
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
