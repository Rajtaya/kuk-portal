'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  createdAt: string;
  user: { name: string; email: string };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      api.get<{ data: AuditEntry[] }>('/audit?limit=20').then((res) => setAuditLogs(res.data || []));
    }
  }, [user]);

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>

      <div className="space-y-6">
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Account</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-900 dark:text-gray-100">
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="font-medium">{user?.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="font-medium">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Role</dt>
              <dd className="font-medium">{user?.role?.replace('_', ' ')}</dd>
            </div>
            {user?.university && (
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">University</dt>
                <dd className="font-medium">{user.university.name}</dd>
              </div>
            )}
          </dl>
        </section>

        {user?.role === 'SUPER_ADMIN' && (
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Recent Audit Logs</h3>
            {auditLogs.length === 0 ? (
              <p className="text-gray-400 text-sm">No audit logs yet</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 text-sm text-gray-900 dark:text-gray-200">
                    <div>
                      <span className="font-medium">{log.user.name}</span>
                      <span className="text-gray-400 mx-2">&middot;</span>
                      <span className="text-gray-600 dark:text-gray-400">{log.action} {log.entity}</span>
                    </div>
                    <span className="text-gray-400 text-xs">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
