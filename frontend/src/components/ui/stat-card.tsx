import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: 'orange' | 'amber' | 'yellow' | 'red' | 'green';
}

const colorMap = {
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  green: 'bg-green-50 text-green-700 border-green-200',
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
