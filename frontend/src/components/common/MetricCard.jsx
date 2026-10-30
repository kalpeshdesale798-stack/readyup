import {
  FileCheck,
  Target,
  Clock,
  Award,
  Users,
  BookOpen,
  FolderGit2,
  Building2,
  FileSpreadsheet,
  GraduationCap,
  ShieldCheck,
  Activity,
  TrendingUp,
  Brain,
  Timer,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';

const iconMap = {
  FileCheck,
  Target,
  Clock,
  Award,
  Users,
  BookOpen,
  FolderGit2,
  Building2,
  FileSpreadsheet,
  GraduationCap,
  ShieldCheck,
  Activity,
  TrendingUp,
  Brain,
  Timer,
  CheckCircle2,
  AlertCircle
};

export default function MetricCard({
  label,
  value,
  subtext,
  icon,
  color = 'teal',
  className = '',
  onClick,
  ariaLabel
}) {
  const IconComponent = typeof icon === 'string' ? iconMap[icon] || Target : icon || Target;

  const colorStyles = {
    teal: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40'
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40'
    },
    blue: {
      bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40'
    },
    emerald: {
      bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40'
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40'
    },
    sky: {
      bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40'
    }
  }[color] || {
    bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40'
  };

  const isInteractive = typeof onClick === 'function';

  const cardInner = (
    <>
      <div className="flex items-center justify-between gap-3.5 mb-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorStyles.bg}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-tight truncate">{label}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">{value}</h3>
          </div>
        </div>
        {isInteractive && (
          <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/60 transition-colors shrink-0">
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        )}
      </div>
      {subtext && (
        <p className="text-xs text-slate-400 dark:text-slate-500 font-normal pl-1 truncate">{subtext}</p>
      )}
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel || `View details for ${label}`}
        className={`w-full text-left bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 card-shadow transition-all hover:card-shadow-hover hover:-translate-y-0.5 hover:border-teal-400/50 dark:hover:border-teal-500/50 cursor-pointer group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${className}`}
      >
        {cardInner}
      </button>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 card-shadow transition-all hover:card-shadow-hover hover:-translate-y-0.5 ${className}`}>
      {cardInner}
    </div>
  );
}
