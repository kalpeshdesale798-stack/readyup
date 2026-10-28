import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Users,
  Timer,
  Building2,
  ArrowRight,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { coordinatorService } from '../services/coordinatorService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

export default function CoordinatorAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await coordinatorService.getAnalytics();
        setData(res);
      } catch (err) {
        console.error('Failed to load coordinator analytics:', err);
        addToast({ title: 'Error', message: 'Failed to load analytics data', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse max-w-7xl mx-auto pb-16">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-2xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        </div>
        <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  const topicAccuracy = data?.topicAccuracy || [];
  const strongTopics = data?.strongTopics || [];
  const weakTopics = data?.weakTopics || [];
  const atRiskStudents = data?.atRiskStudents || [];
  const testComparison = data?.testComparison || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 text-teal-800 dark:text-teal-300 text-xs font-bold tracking-wider uppercase mb-1">
          <BarChart3 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          CAMPUS APTITUDE PERFORMANCE INTELLIGENCE
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Performance Insights & Academic Support
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Aggregated topic accuracy across completed placement simulations, institutional strength areas, and actionable interventions for candidates needing academic support.
        </p>
      </div>

      {/* Strong vs Weak Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Strong Topics */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-900/60 card-shadow">
          <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm uppercase tracking-wider">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Institutional Strengths (Accuracy ≥ 70%)
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Topics where candidates demonstrate strong conceptual foundation and high speed.
          </p>

          <div className="mt-4 space-y-2.5">
            {strongTopics.length === 0 ? (
              <p className="text-xs text-slate-400">Needs more mock test attempt data.</p>
            ) : (
              strongTopics.map((t) => (
                <div
                  key={t.topic}
                  className="p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{t.topic}</span>
                    <span className="text-[10px] text-slate-400 block">{t.category}</span>
                  </div>
                  <div className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                    {t.accuracy}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weak Topics */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-50/80 to-amber-50/40 dark:from-rose-950/30 dark:to-amber-950/20 border border-rose-200/80 dark:border-rose-900/60 card-shadow">
          <div className="flex items-center gap-2.5 text-rose-800 dark:text-rose-300 font-extrabold text-sm uppercase tracking-wider">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            Focus Areas Needing Reinforcement (Accuracy &lt; 50%)
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Topics where high error rates are observed across student test submissions.
          </p>

          <div className="mt-4 space-y-2.5">
            {weakTopics.length === 0 ? (
              <p className="text-xs text-slate-400">No critically low topics identified.</p>
            ) : (
              weakTopics.map((t) => (
                <div
                  key={t.topic}
                  className="p-3 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{t.topic}</span>
                    <span className="text-[10px] text-slate-400 block">{t.category}</span>
                  </div>
                  <div className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                    {t.accuracy}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* At-Risk Students: Needing Academic Support */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-sm uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              Candidates Requiring Academic Support
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Enrolled students whose completed test accuracy is below 55% or who have failed multiple tests.
            </p>
          </div>

          <button
            onClick={() => navigate('/coordinator/students')}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer self-start sm:self-auto"
          >
            Open student directory →
          </button>
        </div>

        <div className="overflow-x-auto">
          {atRiskStudents.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No students currently flagged as critically at risk. All candidate averages are in normal bands.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Tests Completed</th>
                  <th className="py-3 px-4">Average Accuracy</th>
                  <th className="py-3 px-4">Failed Attempts</th>
                  <th className="py-3 px-4 text-right">Suggested Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {atRiskStudents.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {s.name}
                      <span className="text-[11px] text-slate-400 block font-normal">{s.email}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {s.studentId}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {s.department}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {s.completedTests}
                    </td>
                    <td className="py-3 px-4 font-mono font-extrabold text-rose-600 dark:text-rose-400">
                      {s.avgAccuracy}%
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-700 dark:text-rose-300">
                      {s.failedCount}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                        Assign Foundational Drill
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Comprehensive Topic Accuracy Breakdown */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 card-shadow">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Topic-Wise Accuracy & Diagnostic Breakdown
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Aggregated response accuracy across all active test questions presented in completed attempts.
        </p>

        <div className="space-y-4">
          {topicAccuracy.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No topic responses recorded yet.</p>
          ) : (
            topicAccuracy.map((item) => (
              <div key={item.topic} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.topic}</span>
                    <span className="text-[10px] text-slate-400 font-medium">({item.category})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px]">
                      {item.correctCount} / {item.answeredCount} correct
                    </span>
                    <span
                      className={`font-mono font-extrabold ${
                        item.status === 'strong'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : item.status === 'weak'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {item.accuracy}%
                    </span>
                  </div>
                </div>

                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.status === 'strong'
                        ? 'bg-emerald-500'
                        : item.status === 'weak'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, item.accuracy))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
