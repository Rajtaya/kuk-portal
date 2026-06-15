const BADGE_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  RETIRED: 'bg-gray-100 text-gray-600 border-gray-200',
  RESIGNED: 'bg-amber-100 text-amber-700 border-amber-200',
  TERMINATED: 'bg-red-100 text-red-700 border-red-200',
  SUSPENDED: 'bg-orange-100 text-orange-700 border-orange-200',

  BUDGETED: 'bg-primary-100 text-primary-700 border-primary-200',
  SFS: 'bg-purple-100 text-purple-700 border-purple-200',
  CONTRACTUAL: 'bg-teal-100 text-teal-700 border-teal-200',

  MALE: 'bg-sky-100 text-sky-700 border-sky-200',
  FEMALE: 'bg-pink-100 text-pink-700 border-pink-200',
  OTHER: 'bg-gray-100 text-gray-600 border-gray-200',

  UR: 'bg-slate-100 text-slate-700 border-slate-200',
  DSC: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  OSC: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  BCA: 'bg-violet-100 text-violet-700 border-violet-200',
  BCB: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  EWS: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  PWD: 'bg-rose-100 text-rose-700 border-rose-200',

  SUPER_ADMIN: 'bg-red-100 text-red-700 border-red-200',
  STATE_USER: 'bg-primary-100 text-primary-700 border-primary-200',
  UNIVERSITY_ADMIN: 'bg-green-100 text-green-700 border-green-200',
};

const LABEL_MAP: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  STATE_USER: 'State User',
  UNIVERSITY_ADMIN: 'Uni Admin',
  SFS: 'SFS',
  BUDGETED: 'Budgeted',
  CONTRACTUAL: 'Contractual',
};

export function Badge({ value, className = '' }: { value: string; className?: string }) {
  const style = BADGE_STYLES[value] || 'bg-gray-100 text-gray-600 border-gray-200';
  const label = LABEL_MAP[value] || value;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${style} ${className}`}>
      {label}
    </span>
  );
}
