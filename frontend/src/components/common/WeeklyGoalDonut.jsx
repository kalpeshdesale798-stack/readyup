export default function WeeklyGoalDonut({
  percentage = 75,
  current = 3,
  target = 4,
  label = 'Weekly Mock Test Goal',
  subtext = '1 test remaining this week'
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col justify-between h-full">
      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">This Week</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      </div>

      <div className="my-6 flex flex-col items-center justify-center">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-slate-100 dark:text-slate-700/60"
              strokeWidth="9"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Progress arc */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-teal-600 transition-all duration-1000 ease-out"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {percentage}%
            </span>
          </div>
        </div>

        <div className="text-center mt-3">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {current} of {target} mock tests completed
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {subtext}
          </p>
        </div>
      </div>
    </div>
  );
}
