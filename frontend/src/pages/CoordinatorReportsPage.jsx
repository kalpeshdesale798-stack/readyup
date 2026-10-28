import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Filter,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Users,
  Timer,
  Building2,
  Sparkles,
  Search
} from 'lucide-react';
import { coordinatorService } from '../services/coordinatorService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

export default function CoordinatorReportsPage() {
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'students' | 'participation'
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [testsData, setTestsData] = useState([]);
  const [studentsData, setStudentsData] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { addToast } = useToast();

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [testsRes, studentsRes] = await Promise.all([
        coordinatorService.getMockTests({
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined
        }),
        coordinatorService.getStudents({
          department: departmentFilter !== 'all' ? departmentFilter : undefined
        })
      ]);
      setTestsData(testsRes.data || []);
      setStudentsData(studentsRes.data || []);
    } catch (err) {
      console.error('Failed to load reports data:', err);
      addToast({ title: 'Error', message: 'Failed to load report data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [statusFilter, departmentFilter]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await coordinatorService.exportResultsCsv({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      });
      addToast({
        title: 'Export Generated',
        message: 'Your report CSV file has been downloaded successfully.',
        type: 'success'
      });
    } catch (err) {
      console.error('Export CSV error:', err);
      addToast({
        title: 'Export Failed',
        message: err.message || 'Could not generate report export.',
        type: 'error'
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 text-teal-800 dark:text-teal-300 text-xs font-bold tracking-wider uppercase mb-1">
            <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            CAMPUS PLACEMENT AUDIT & COMPLIANCE
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Placement Test Reports & Data Export
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Generate and export test-wise, candidate-wise, and participation audit spreadsheets for internal review and faculty placement reports.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Generating Export...' : 'Export Filtered CSV'}</span>
        </button>
      </div>

      {/* Filter and Date Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 card-shadow flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Department:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Departments</option>
              <option value="Computer Science">Computer Science & Eng</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Electronics">Electronics Eng</option>
              <option value="Mechanical">Mechanical Eng</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Attempt Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed Only</option>
              <option value="in-progress">In-Progress</option>
              <option value="expired">Expired / Late</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-100 dark:border-slate-800 card-shadow overflow-hidden">
        {/* Navigation Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 sm:gap-4 overflow-x-auto">
          {[
            { id: 'tests', label: 'Test-Wise Results Report' },
            { id: 'students', label: 'Student Performance Report' },
            { id: 'participation', label: 'Attempted vs Not-Attempted Report' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Test-Wise Results Report */}
        {activeTab === 'tests' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">Loading test report...</div>
            ) : testsData.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">No mock tests found matching filters.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3.5 px-5">Mock Test Title</th>
                    <th className="py-3.5 px-4">Company Pattern</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4">Total Attempts</th>
                    <th className="py-3.5 px-4">Completed</th>
                    <th className="py-3.5 px-4">Pass Rate</th>
                    <th className="py-3.5 px-4">Avg Accuracy</th>
                    <th className="py-3.5 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {testsData.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                      <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                        {t.title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {t.company || 'General'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {t.durationMinutes} mins ({t.totalQuestions} Qs)
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {t.totalAttempts}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 font-semibold">
                        {t.completedAttempts}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {t.passRate}%
                      </td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-teal-600 dark:text-teal-400">
                        {t.averageAccuracy}%
                      </td>
                      <td className="py-3.5 px-5">
                        <Badge variant={t.scheduleStatus === 'upcoming' ? 'Needs Review' : 'Passed'}>
                          {t.scheduleStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Student Performance Report */}
        {activeTab === 'students' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">Loading student report...</div>
            ) : studentsData.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">No students found matching filters.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3.5 px-5">Candidate Name</th>
                    <th className="py-3.5 px-4">Student ID</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Graduation Year</th>
                    <th className="py-3.5 px-4">Tests Attempted</th>
                    <th className="py-3.5 px-4">Completed</th>
                    <th className="py-3.5 px-4">Average Accuracy</th>
                    <th className="py-3.5 px-5">Performance Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {studentsData.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                      <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                        {s.name}
                        <span className="text-[11px] text-slate-400 block font-normal">{s.email}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {s.studentId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {s.department}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {s.graduationYear}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {s.testsAttempted}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 font-semibold">
                        {s.testsCompleted}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-teal-600 dark:text-teal-400">
                        {s.avgAccuracy}%
                      </td>
                      <td className="py-3.5 px-5">
                        <Badge
                          variant={
                            s.avgAccuracy >= 75
                              ? 'Passed'
                              : s.avgAccuracy >= 55
                                ? 'Needs Review'
                                : 'Incomplete'
                          }
                        >
                          {s.avgAccuracy >= 75 ? 'Placement Ready' : s.avgAccuracy >= 55 ? 'Moderate' : 'Needs Practice'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Attempted vs Not-Attempted Report */}
        {activeTab === 'participation' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">Loading participation report...</div>
            ) : testsData.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">No mock tests available.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3.5 px-5">Mock Test Title</th>
                    <th className="py-3.5 px-4">Eligible Students</th>
                    <th className="py-3.5 px-4">Candidates Attempted</th>
                    <th className="py-3.5 px-4">Pending (Unattempted)</th>
                    <th className="py-3.5 px-4">Participation Rate</th>
                    <th className="py-3.5 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {testsData.map((t) => {
                    const participationPct = t.eligibleStudentsCount > 0
                      ? Math.round((t.uniqueStudentsAttempted / t.eligibleStudentsCount) * 100)
                      : 0;

                    return (
                      <tr key={t._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                        <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                          {t.title}
                          <span className="text-[11px] text-slate-400 block font-normal">
                            {t.company || 'General'} • {t.durationMinutes} mins
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {t.eligibleStudentsCount}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {t.uniqueStudentsAttempted}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">
                          {t.unattemptedCount}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {participationPct}%
                            </span>
                            <div className="h-1.5 w-16 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-500 rounded-full"
                                style={{ width: `${Math.min(100, participationPct)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <Badge variant={t.scheduleStatus === 'upcoming' ? 'Needs Review' : 'Passed'}>
                            {t.scheduleStatus}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
