'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/layout/sidebar';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user && user.role === 'STATE_USER') router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading || !user || user.role === 'STATE_USER') return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 min-w-0 overflow-x-hidden mt-14 md:mt-0">{children}</main>
    </div>
  );
}
