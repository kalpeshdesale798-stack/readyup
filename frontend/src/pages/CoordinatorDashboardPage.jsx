import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  BookOpen,
  FolderGit2,
  Users,
  Timer,
  CheckCircle2,
  Award,
  AlertCircle,
  TrendingUp,
  Activity,
  ArrowRight,
  UploadCloud,
  Eye,
  BarChart3,
  FileText,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { coordinatorService } from '../services/coordinatorService';
import MetricCard from '../components/common/MetricCard';
import Badge from '../components/common/Badge';
import AttemptReviewModal from '../components/coordinator/AttemptReviewModal';

export default function CoordinatorDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'imports'
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const navigate = useNavigate();

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await coordinatorService.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load coordinator dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-8 animate-pulse max-w-7xl mx-auto pb-16">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-2xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  // Use upgraded database-backed summary cards if present, fallback to metricCards
  const summaryCards = data?.summaryCards || data?.metricCards || [];
  const recentActivity = data?.recentActivity || [];
  const recentImports = data?.importHistory || data?.recentImports || [];
  const metrics = data?.metrics || {};

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 text-teal-800 dark:text-teal-300 text-xs font-bold tracking-wider uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            T&P COORDINATOR OPERATIONS HUB
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Mock-Test Monitoring & Placement Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Live campus simulation tracking, student participation analytics, test scheduling, and question bank administration.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadDashboard}
            className="p-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Refresh Metrics"
            aria-label="Refresh Dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/coordinator/mock-tests')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
          >
            <Timer className="w-4 h-4 text-teal-600" />
            <span>Manage Tests</span>
          </button>
          <button
            onClick={() => navigate('/coordinator/students')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
          >
            <Users className="w-4 h-4 text-sky-600" />
            <span>Student Directory</span>
          </button>
          <button
            onClick={() => navigate('/coordinator/import')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Questions</span>
          </button>
        </div>
      </div>

      {/* 8 Database-Backed Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            subtext={m.subtext}
            icon={m.icon}
            color={m.color}
          />
        ))}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/coordinator/mock-tests')}
          className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 hover:border-teal-500/60 transition-all card-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Timer className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-sm">
            Mock-Test Monitoring & Scheduling
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track test participation, assign batches, set deadlines, and inspect attempts.
          </p>
        </div>

        <div
          onClick={() => navigate('/coordinator/analytics')}
          className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 hover:border-sky-500/60 transition-all card-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-sm">
            Topic Analytics & Support
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Identify weak and strong aptitude topics and candidates needing academic assistance.
          </p>
        </div>

        <div
          onClick={() => navigate('/coordinator/reports')}
          className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 hover:border-amber-500/60 transition-all card-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white mt-3 text-sm">
            Reports & CSV Export
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate test-wise, student-wise, and participation audit reports with 1-click export.
          </p>
        </div>
      </div>

      {/* Main Activity Section: Tabs for Mock Tests vs Spreadsheet Imports */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-100 dark:border-slate-800 card-shadow overflow-hidden">
        {/* Section Header with Tabs */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('tests')}
                className={`text-sm sm:text-base font-bold pb-1 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'tests'
                    ? 'border-teal-600 text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Recent Mock-Test Submissions
              </button>
              <button
                onClick={() => setActiveTab('imports')}
                className={`text-sm sm:text-base font-bold pb-1 transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'imports'
                    ? 'border-teal-600 text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                Spreadsheet Import Logs
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'tests'
                ? 'Latest candidate mock-test attempts and performance logs'
                : 'History of bulk uploaded aptitude question batches'}
            </p>
          </div>

          <div>
            {activeTab === 'tests' ? (
              <button
                onClick={() => navigate('/coordinator/mock-tests')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
              >
                View all mock tests & attempts →
              </button>
            ) : (
              <button
                onClick={() => navigate('/coordinator/history')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
              >
                View all import history →
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Recent Mock-Test Submissions Table */}
        {activeTab === 'tests' && (
          <div className="overflow-x-auto">
            {recentActivity.length === 0 ? (
              <div className="py-16 text-center">
                <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No mock-test attempts recorded yet
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Student test submissions and in-progress simulations will automatically populate here.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3.5 px-5">Candidate</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Mock Test</th>
                    <th className="py-3.5 px-4">Score</th>
                    <th className="py-3.5 px-4">Accuracy</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Attempted At</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentActivity.map((item) => (
                    <tr
                      key={item._id || item.attemptId}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.studentName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.studentId || item.studentEmail}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {item.department}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {item.testTitle}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {item.status === 'completed' ? `${item.score} / ${item.totalMarks}` : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.status === 'completed' ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono font-bold ${
                                item.accuracy >= 60 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {item.accuracy}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            item.status === 'completed'
                              ? item.result === 'Passed'
                                ? 'Passed'
                                : 'Needs Review'
                              : 'Pending'
                          }
                        >
                          {item.status === 'completed' ? item.result || 'Completed' : 'In Progress'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(item.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {item.status === 'completed' ? (
                          <button
                            onClick={() =>
                              setSelectedAttempt({
                                attemptId: item.attemptId || item._id,
                                studentName: item.studentName,
                                studentId: item.studentId,
                                department: item.department
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 font-semibold transition-colors cursor-pointer text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-purple-600 font-semibold">Active Session</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Recent Spreadsheet Imports Table */}
        {activeTab === 'imports' && (
          <div className="overflow-x-auto">
            {recentImports.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No spreadsheet imports on record.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3.5 px-5">Batch ID</th>
                    <th className="py-3.5 px-4">Filename</th>
                    <th className="py-3.5 px-4">Uploaded Date</th>
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Rows</th>
                    <th className="py-3.5 px-4">Inserted</th>
                    <th className="py-3.5 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentImports.map((item) => (
                    <tr
                      key={item.importBatchId}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="py-3.5 px-5 font-mono font-bold text-teal-600">
                        {item.importBatchId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {item.filename}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(item.uploadedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {item.uploaderName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {item.totalRows}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 font-bold">
                        +{item.insertedCount}
                      </td>
                      <td className="py-3.5 px-5">
                        <Badge variant={item.status === 'published' || item.status === 'Completed' ? 'Passed' : 'Needs Review'}>
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Spreadsheet Upload Banner */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30 rounded-3xl p-6 sm:p-8 border border-teal-100 dark:border-teal-900/60 card-shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-600/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                BULK QUESTION IMPORT WORKFLOW
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Upload New Placement Aptitude Spreadsheet (.xlsx / .csv)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                Parse candidate questions, validate syntax against company blueprints, preview rows safely, and publish directly to the live test repository.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/coordinator/import')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer shrink-0"
          >
            <span>Launch Upload Wizard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Answer Review Modal */}
      {selectedAttempt && (
        <AttemptReviewModal
          attemptId={selectedAttempt.attemptId}
          studentInfo={selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
        />
      )}
    </div>
  );
}
