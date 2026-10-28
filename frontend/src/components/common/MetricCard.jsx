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
  Brain
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
  Brain
};

export default function MetricCard({ label, value, subtext, icon, color = 'teal', className = '' }) {
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
    }
  }[color] || {
    bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40'
  };

  return (
    <div className={`bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 card-shadow transition-all hover:card-shadow-hover hover:-translate-y-0.5 ${className}`}>
      <div className="flex items-center gap-3.5 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorStyles.bg}`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-tight">{label}</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">{value}</h3>
        </div>
      </div>
      {subtext && (
        <p className="text-xs text-slate-400 dark:text-slate-500 font-normal pl-1">{subtext}</p>
      )}
    </div>
  );
}
