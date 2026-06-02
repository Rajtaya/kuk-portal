import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: 'orange' | 'amber' | 'yellow' | 'red' | 'green';
}

const colorMap = {
  orange: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/20',
  red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
  green: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20',
};

export default function StatCard({ title, value, subtitle, color = 'orange' }: StatCardProps) {
  return (
    <div className={clsx('rounded-xl border p-5', colorMap[color])}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs mt-1 opacity-60">{subtitle}</p>}
    </div>
  );
}
