import { Sparkles, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NextBestActionBanner({
  label = 'NEXT BEST ACTION',
  title = 'Practice Time and Work',
  description = 'Your accuracy in Time and Work is currently 50%. Solve a curated practice set to build speed and accuracy.',
  ctaText = 'Start Practice →',
  onAction,
  targetTopic,
  targetCategory,
  className = ''
}) {
  const navigate = useNavigate();

  const handleCta = () => {
    if (onAction) {
      onAction();
    } else if (targetTopic) {
      navigate(`/practice?topic=${encodeURIComponent(targetTopic)}&category=${encodeURIComponent(targetCategory || '')}`);
    } else {
      navigate('/practice');
    }
  };

  return (
    <div
      className={`rounded-2xl p-5 md:p-6 border border-teal-100 dark:border-teal-900/50 bg-[#F0FDF4]/90 dark:bg-emerald-950/20 card-shadow relative overflow-hidden transition-all ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200/60 dark:border-teal-900 shadow-sm mt-0.5">
            <Calendar className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
                {label}
              </span>
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {title}
            </h4>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start md:self-center pl-15 md:pl-0">
          <button
            onClick={handleCta}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs md:text-sm shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer active:scale-95"
          >
            <span>{ctaText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
