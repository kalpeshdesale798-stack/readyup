export default function Badge({ children, variant = 'neutral', size = 'md', className = '' }) {
  let colorStyles = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

  const v = variant.toLowerCase();
  if (v.includes('pending') || v.includes('review') || v === 'amber' || v === 'warning') {
    colorStyles = 'bg-amber-100/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/50';
  } else if (v.includes('pass') || v.includes('verif') || v === 'emerald' || v === 'success') {
    colorStyles = 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/50';
  } else if (v.includes('change') || v.includes('fail') || v.includes('error') || v === 'rose' || v === 'danger') {
    colorStyles = 'bg-rose-100/80 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/50';
  } else if (v === 'teal' || v === 'primary') {
    colorStyles = 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/50 dark:border-teal-900/50';
  } else if (v === 'blue') {
    colorStyles = 'bg-sky-100/80 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/50 dark:border-sky-900/50';
  }

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full transition-colors whitespace-nowrap ${sizeStyles} ${colorStyles} ${className}`}>
      {children}
    </span>
  );
}
