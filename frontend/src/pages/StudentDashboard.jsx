import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck,
  Target,
  Clock,
  Award,
  ChevronRight,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Brain,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { analyticsService } from '../services/analyticsService';
import MetricCard from '../components/common/MetricCard';
import NextBestActionBanner from '../components/common/NextBestActionBanner';
import WeeklyGoalDonut from '../components/common/WeeklyGoalDonut';
import Badge from '../components/common/Badge';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      try {
        const res = await analyticsService.getStudentDashboard();
        if (isMounted) setData(res);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const rawMetrics = data?.metrics;
  const metrics = Array.isArray(rawMetrics)
    ? rawMetrics
    : Array.isArray(data?.metricCards)
    ? data.metricCards
    : rawMetrics
    ? [
        {
          id: 'tests-completed',
          label: 'Tests Completed',
          value: rawMetrics.testsCompleted ?? 0,
          subtext: 'Across practice & mock tests',
          icon: 'FileCheck',
          color: 'teal',
        },
        {
          id: 'avg-accuracy',
          label: 'Average Accuracy',
          value: `${rawMetrics.averageAccuracy ?? 0}%`,
          subtext: 'Placement target: 75%+',
          icon: 'Target',
          color: 'emerald',
        },
        {
          id: 'study-time',
          label: 'Study Time',
          value: `${rawMetrics.studyTimeHours ?? 0} hrs`,
          subtext: 'Time spent practicing',
          icon: 'Clock',
          color: 'amber',
        },
        {
          id: 'pass-rate',
          label: 'Pass Rate',
          value: `${rawMetrics.passRate ?? 0}%`,
          subtext: 'Tests meeting cut-off',
          icon: 'Award',
          color: 'indigo',
        },
      ]
    : [];

  const nextAction = data?.nextBestAction || {
    label: 'NEXT BEST ACTION',
    title: 'Time and Work Speed Drill',
    description: 'Solve a curated 10-question practice set to build core aptitude speed and accuracy for placement rounds.',
    ctaText: 'Start Practice →',
    targetTopic: 'Time and Work',
    targetCategory: 'Quantitative Aptitude'
  };
  const weekly = data?.weeklyProgress || data?.weeklyGoal || { percentage: 0, current: 0, target: 4, label: 'Weekly Mock Test Goal', subtext: '4 tests remaining this week' };
  const recentAttempts = data?.recentAttempts || [];
  const weakTopics = data?.weakTopics || [];
  const strongTopics = data?.strongTopics || [];

  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome Header matching ProjectSync Reference */}
      <div>
        <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
          STUDENT WORKSPACE
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
          Welcome back, {firstName}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          You have 1 recommended practice drill waiting and {weekly.current} mock tests completed this week.
        </p>
      </div>

      {/* 4 Metric Cards Grid matching Screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {metrics.map((m) => (
          <MetricCard
            key={m.id || m.label}
            label={m.label}
            value={m.value}
            subtext={m.subtext}
            icon={m.icon}
            color={m.color}
          />
        ))}
      </div>

      {/* Prominent Banner Card: "NEXT BEST ACTION" matching Screenshot */}
      <NextBestActionBanner
        label={nextAction.label}
        title={nextAction.title}
        description={nextAction.description}
        ctaText={nextAction.ctaText}
        targetTopic={nextAction.targetTopic}
        targetCategory={nextAction.targetCategory}
      />

      {/* Two-Column Middle Section matching Screenshot Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Test Attempts (65% width) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Recent Test Attempts
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click an attempt to review questions, answer keys, and detailed solutions
                </p>
              </div>
              <button
                onClick={() => navigate('/tests')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer hidden sm:block"
              >
                View all tests →
              </button>
            </div>

            {/* List of Attempt items matching screenshot cards */}
            <div className="space-y-3">
              {recentAttempts.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/40">
                  <Lightbulb className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No attempts logged yet
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Complete your first aptitude practice session or mock test to view detailed solution review and performance trends here.
                  </p>
                  <button
                    onClick={() => navigate('/practice')}
                    className="mt-3.5 px-4 py-1.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Start First Practice Drill
                  </button>
                </div>
              ) : (
                recentAttempts.map((attempt) => (
                  <div
                    key={attempt.id || attempt._id}
                    onClick={() => navigate(`/tests/review/${attempt.id || attempt._id}`)}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:border-teal-200 dark:hover:border-teal-800/60 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
                        <Lightbulb className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                          {attempt.title}
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          Score: {attempt.score}/{attempt.totalMarks} • {attempt.percentage ?? attempt.accuracy}% • {new Date(attempt.submittedAt || attempt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={attempt.passed ? 'Passed' : 'Needs Review'}>
                        {attempt.passed ? 'Passed' : 'Needs Review'}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span>Authoritative scoring provided by backend validation rules</span>
            <button
              onClick={() => navigate('/revision')}
              className="font-semibold text-teal-600 hover:underline cursor-pointer"
            >
              Open Revision Centre
            </button>
          </div>
        </div>

        {/* Right Column: Weekly Goal Donut Widget matching Screenshot */}
        <div className="lg:col-span-1">
          <WeeklyGoalDonut
            percentage={weekly.percentage}
            current={weekly.current}
            target={weekly.target}
            label={weekly.label}
            subtext={weekly.subtext}
          />
        </div>
      </div>

      {/* Bottom Section: "Your Assigned Groups" equivalent -> Target Focus Areas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Target Aptitude Topics
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Identified from your attempt accuracy and placement cut-offs
            </p>
          </div>
          <button
            onClick={() => navigate('/practice')}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 cursor-pointer"
          >
            Explore all topics →
          </button>
        </div>

        {weakTopics.length === 0 && strongTopics.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow text-center">
            <Brain className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Personalized Concept Mastery Calibration
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Complete practice drills in Quantitative, Logical, and Verbal aptitude to calibrate your strengths, identify cut-off weak areas, and generate target topics.
            </p>
            <button
              onClick={() => navigate('/practice')}
              className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>Explore Practice Topics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Weak Topics */}
            {weakTopics.map((top) => (
              <div
                key={top.topic}
                onClick={() => navigate(`/practice?topic=${encodeURIComponent(top.topic)}`)}
                className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 card-shadow hover:card-shadow-hover transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono text-slate-400">QA-FOCUS</span>
                    <Badge variant="warning">{top.accuracy}% Accuracy</Badge>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                    {top.topic}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {top.category} • {top.totalQuestions} questions attempted. Accuracy is below the 60% placement benchmark.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-teal-600 font-semibold">
                  <span>Start 10-Q Drill</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}

            {/* Strong Topic */}
            {strongTopics.slice(0, 1).map((top) => (
              <div
                key={top.topic}
                onClick={() => navigate(`/practice?topic=${encodeURIComponent(top.topic)}`)}
                className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 card-shadow hover:card-shadow-hover transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono text-slate-400">QA-STRONG</span>
                    <Badge variant="success">{top.accuracy}% Accuracy</Badge>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                    {top.topic}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {top.category} • {top.totalQuestions} questions attempted. Strong concept mastery. Maintain with timed mock tests.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-emerald-600 font-semibold">
                  <span>Maintain Speed</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
