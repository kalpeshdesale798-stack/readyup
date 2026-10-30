import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search
} from 'lucide-react';
import { coordinatorService } from '../services/coordinatorService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';
import { ALLOWED_DEPARTMENTS } from '../constants/departments.js';
import {
  matchDepartment,
  matchTestDepartment,
  buildCsvContent,
  getReportExportData
} from '../utils/reportsExport.js';

export default function CoordinatorReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const getValidTab = (raw) => {
    if (!raw) return 'tests';
    const lower = raw.toLowerCase();
    if (lower === 'participation') return 'participation';
    if (lower === 'students' || lower === 'candidate' || lower === 'candidates') return 'students';
    if (lower === 'tests' || lower === 'mock-tests') return 'tests';
    return 'tests';
  };

  const getValidStatus = (raw) => {
    if (!raw) return 'all';
    const lower = raw.toLowerCase();
    if (['all', 'completed', 'in-progress', 'expired', 'attempted', 'unattempted'].includes(lower)) return lower;
    return 'all';
  };

  const activeTab = getValidTab(searchParams.get('tab'));
  const statusFilter = getValidStatus(searchParams.get('status'));
  const selectedTestId = searchParams.get('testId') || '';
  const departmentFilter = searchParams.get('department') || 'all';

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [testsData, setTestsData] = useState([]);
  const [studentsData, setStudentsData] = useState([]);
  const [search, setSearch] = useState('');

  // Context-specific state for attempted, unattempted, and in-progress views
  const [testAttempts, setTestAttempts] = useState([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [unattemptedStudents, setUnattemptedStudents] = useState([]);
  const [unattemptedLoading, setUnattemptedLoading] = useState(false);
  const [inProgressAttempts, setInProgressAttempts] = useState([]);
  const [inProgressLoading, setInProgressLoading] = useState(false);

  const { addToast } = useToast();

  const handleTabChange = (newTab) => {
    const next = new URLSearchParams();
    next.set('tab', newTab);
    if (departmentFilter && departmentFilter !== 'all') {
      next.set('department', departmentFilter);
    }
    // Switching tabs always resets status and test selection to prevent tab hijacking
    setSearchParams(next);
  };

  const handleStatusChange = (newStatus) => {
    const next = new URLSearchParams(searchParams);
    if (newStatus && newStatus !== 'all') {
      next.set('status', newStatus);
    } else {
      next.delete('status');
      next.delete('testId');
    }
    setSearchParams(next);
  };

  const handleDepartmentChange = (newDept) => {
    const next = new URLSearchParams(searchParams);
    if (newDept && newDept !== 'all') {
      next.set('department', newDept);
    } else {
      next.delete('department');
    }
    setSearchParams(next);
  };

  const handleTestSelect = (testId) => {
    const next = new URLSearchParams(searchParams);
    if (testId) {
      next.set('testId', testId);
    } else {
      next.delete('testId');
    }
    setSearchParams(next);
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const isCustomStatus = ['attempted', 'unattempted'].includes(statusFilter);
      const [testsRes, studentsRes] = await Promise.all([
        coordinatorService.getMockTests({
          search: search || undefined,
          status: !isCustomStatus && statusFilter !== 'all' ? statusFilter : undefined
        }),
        coordinatorService.getStudents({
          department: departmentFilter !== 'all' ? departmentFilter : undefined,
          search: search || undefined
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

  // Load test-specific attempts when on tests tab with statusFilter === 'attempted' and testId is present
  useEffect(() => {
    if (activeTab === 'tests' && statusFilter === 'attempted' && selectedTestId) {
      setAttemptsLoading(true);
      coordinatorService
        .getMockTestAttempts(selectedTestId, {
          department: departmentFilter !== 'all' ? departmentFilter : undefined,
          search: search || undefined
        })
        .then((res) => {
          setTestAttempts(res.data || []);
        })
        .catch((err) => {
          console.error('Failed to load test attempts:', err);
          addToast({ title: 'Error', message: 'Failed to load test attempts', type: 'error' });
        })
        .finally(() => setAttemptsLoading(false));
    }
  }, [activeTab, statusFilter, selectedTestId, departmentFilter]);

  // Load unattempted students when on participation tab with statusFilter === 'unattempted' and testId is present
  useEffect(() => {
    if (activeTab === 'participation' && statusFilter === 'unattempted' && selectedTestId) {
      setUnattemptedLoading(true);
      Promise.all([
        coordinatorService.getStudents({
          testId: selectedTestId,
          department: departmentFilter !== 'all' ? departmentFilter : undefined
        }),
        coordinatorService.getMockTestAttempts(selectedTestId, {
          department: departmentFilter !== 'all' ? departmentFilter : undefined
        })
      ])
        .then(([studentsRes, attemptsRes]) => {
          const eligible = studentsRes.data || [];
          const attempts = attemptsRes.data || [];
          const attemptedStudentIds = new Set(
            attempts.map((a) => (a.studentId ? String(a.studentId) : a.studentEmail ? String(a.studentEmail).toLowerCase() : ''))
          );
          const unattempted = eligible.filter(
            (s) => !attemptedStudentIds.has(String(s.studentId)) && !attemptedStudentIds.has(String(s.email).toLowerCase())
          );
          setUnattemptedStudents(unattempted);
        })
        .catch((err) => {
          console.error('Failed to load unattempted students:', err);
          addToast({ title: 'Error', message: 'Failed to load unattempted students', type: 'error' });
        })
        .finally(() => setUnattemptedLoading(false));
    }
  }, [activeTab, statusFilter, selectedTestId, departmentFilter]);

  // Load in-progress attempts across tests when on tests tab with statusFilter === 'in-progress'
  useEffect(() => {
    if (activeTab === 'tests' && statusFilter === 'in-progress') {
      setInProgressLoading(true);
      coordinatorService
        .getMockTestAttempts('all', {
          status: 'in-progress',
          department: departmentFilter !== 'all' ? departmentFilter : undefined
        })
        .then((res) => {
          setInProgressAttempts(res.data || []);
        })
        .catch((err) => {
          console.error('Failed to load in-progress attempts:', err);
        })
        .finally(() => setInProgressLoading(false));
    }
  }, [activeTab, statusFilter, departmentFilter]);

  const handleExportCsv = () => {
    try {
      setExporting(true);
      const { headers, rows } = getReportExportData({
        activeTab,
        testsData,
        studentsData,
        testAttempts,
        inProgressAttempts,
        unattemptedStudents,
        selectedTestObj: testsData.find((t) => t._id === selectedTestId),
        selectedTestId,
        statusFilter,
        departmentFilter,
        search
      });

      if (!rows || rows.length === 0) {
        addToast({
          title: 'Export Notice',
          message: 'No matching records found to export for the current tab and filter settings.',
          type: 'info'
        });
        return;
      }

      const csvContent = buildCsvContent(headers, rows);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filePrefix =
        activeTab === 'tests'
          ? statusFilter === 'attempted'
            ? 'test_attempts'
            : 'test_wise_results'
          : activeTab === 'students'
            ? 'student_performance'
            : 'participation_report';
      link.setAttribute('download', `${filePrefix}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast({
        title: 'Export Generated',
        message: `Successfully exported ${rows.length} record${rows.length === 1 ? '' : 's'} to CSV.`,
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

  const selectedTestObj = testsData.find((t) => t._id === selectedTestId);

  // Filtered views respecting department and search client-side
  const displayedTests = testsData.filter((t) => {
    if (!matchTestDepartment(t, departmentFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchComp = (t.company || '').toLowerCase().includes(q);
      if (!matchTitle && !matchComp) return false;
    }
    return true;
  });

  const displayedStudents = studentsData.filter((s) => {
    if (!matchDepartment(s.department, departmentFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchEmail = (s.email || '').toLowerCase().includes(q);
      const matchId = (s.studentId || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId) return false;
    }
    return true;
  });

  const displayedAttempts = testAttempts.filter((att) => {
    if (!matchDepartment(att.department, departmentFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = (att.studentName || '').toLowerCase().includes(q);
      const matchEmail = (att.studentEmail || '').toLowerCase().includes(q);
      const matchId = (att.studentId || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId) return false;
    }
    return true;
  });

  const displayedInProgress = inProgressAttempts.filter((att) => {
    if (!matchDepartment(att.department, departmentFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = (att.studentName || '').toLowerCase().includes(q);
      const matchEmail = (att.studentEmail || '').toLowerCase().includes(q);
      const matchId = (att.studentId || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId) return false;
    }
    return true;
  });

  const displayedUnattempted = unattemptedStudents.filter((s) => {
    if (!matchDepartment(s.department, departmentFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchEmail = (s.email || '').toLowerCase().includes(q);
      const matchId = (s.studentId || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Back to Coordinator Dashboard */}
      <div>
        <Link
          to="/coordinator/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 mb-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Coordinator Dashboard</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 text-teal-800 dark:text-teal-300 text-xs font-bold tracking-wider uppercase mb-1">
            <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            PLACEMENT ASSESSMENT REPORTS & ANALYTICS
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Comprehensive Institutional Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate and export test completion digests, examine candidate aptitude metrics, track active attempts, and audit participation rates.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Exporting...' : 'Export Results CSV'}</span>
        </button>
      </div>

      {/* Filter and Configuration Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In-Progress</option>
              <option value="attempted">Students Attempted</option>
              <option value="unattempted">Unattempted Students</option>
              <option value="expired">Closed / Expired</option>
            </select>
          </div>

          {/* Department Filter (Single Source of Truth: 10 Approved Phase 1 Departments) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department:</span>
            <select
              value={departmentFilter}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">All Departments</option>
              {ALLOWED_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative self-start md:self-auto w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Contextual Metric Banner for Attempted in Tab 1 */}
      {activeTab === 'tests' && statusFilter === 'attempted' && (
        <div className="p-4 rounded-2xl bg-teal-50/90 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-teal-900 dark:text-teal-100">
                Students Attempted - Detailed Assessment Records
              </h2>
              <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5">
                Select a mock test below to inspect specific student attempt scores, accuracy, and submission outcomes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-teal-800 dark:text-teal-200">Mock Test:</span>
            <select
              value={selectedTestId}
              onChange={(e) => handleTestSelect(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-teal-300 dark:border-teal-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="">-- Select a Mock Test --</option>
              {displayedTests.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.title} ({t.company || 'General'})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Contextual Metric Banner for In-Progress in Tab 1 */}
      {activeTab === 'tests' && statusFilter === 'in-progress' && (
        <div className="p-4 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            <Clock className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-blue-900 dark:text-blue-100">
              In-Progress Tests & Active Candidate Attempts
            </h2>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
              Live monitoring of tests and student exam sessions currently underway across the institution.
            </p>
          </div>
        </div>
      )}

      {/* Contextual Metric Banner for Unattempted in Tab 3 */}
      {activeTab === 'participation' && statusFilter === 'unattempted' && (
        <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                Unattempted Students - Pending Test Participation
              </h2>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Select a mock test below to see eligible students who have not yet submitted attempts for that assessment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-200">Mock Test:</span>
            <select
              value={selectedTestId}
              onChange={(e) => handleTestSelect(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="">-- Select a Mock Test --</option>
              {displayedTests.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.title} ({t.company || 'General'})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Reports Panel */}
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
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${activeTab === tab.id
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
            {statusFilter === 'attempted' ? (
              // Sub-view: Students Attempted for Selected Test
              !selectedTestId ? (
                <div className="py-20 text-center space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Select a Mock Test to View Attempted Students
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Please choose a mock test from the dropdown above to inspect student attempt scores, accuracy, and results.
                  </p>
                </div>
              ) : attemptsLoading ? (
                <div className="py-16 text-center text-xs text-slate-400">Loading test attempts...</div>
              ) : displayedAttempts.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  No student attempts recorded yet matching filters for "{selectedTestObj?.title || 'Selected Test'}".
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3.5 px-5">Candidate</th>
                      <th className="py-3.5 px-4">Student ID</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Score</th>
                      <th className="py-3.5 px-4">Accuracy</th>
                      <th className="py-3.5 px-4">Attempt #</th>
                      <th className="py-3.5 px-4">Status / Result</th>
                      <th className="py-3.5 px-5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedAttempts.map((att) => (
                      <tr key={att._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                        <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                          {att.studentName}
                          <span className="text-[11px] text-slate-400 block font-normal">{att.studentEmail}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">{att.studentId}</td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">{att.department}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {att.score} / {att.totalMarks}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-extrabold text-teal-600 dark:text-teal-400">
                          {att.accuracy}%
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                          Attempt {att.attemptNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={att.result === 'Passed' ? 'Passed' : att.status === 'in-progress' ? 'Needs Review' : 'Incomplete'}>
                            {att.status === 'in-progress' ? 'In Progress' : att.result || att.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-5 text-slate-500">
                          {att.submissionTime ? new Date(att.submissionTime).toLocaleDateString() : att.createdAt ? new Date(att.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              // Standard Test-Wise Results overview table
              <div>
                            {statusFilter === 'in-progress' && (
                              inProgressLoading ? (
                                <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 text-xs text-blue-600 dark:text-blue-300">
                                  Loading active candidate sessions...
                                </div>
                              ) : displayedInProgress.length > 0 ? (
                                <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/40">
                                  <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200 mb-2">
                                    Live Candidate Sessions Currently In Progress ({displayedInProgress.length})
                                  </h3>
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                    {displayedInProgress.slice(0, 5).map((att) => (
                          <div key={att._id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/40">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{att.studentName}</span>
                              <span className="text-[11px] text-slate-400 ml-2">({att.department})</span>
                              <span className="text-[11px] text-teal-600 dark:text-teal-400 block">{att.testTitle}</span>
                            </div>
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold">
                              Active
                            </span>
                          </div>
                        ))}
                                </div>
                    </div>
                      ) : null
                )}
                      {loading ? (
                        <div className="py-16 text-center text-xs text-slate-400">Loading test report...</div>
                      ) : displayedTests.length === 0 ? (
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
                              <th className="py-3.5 px-4">In-Progress</th>
                              <th className="py-3.5 px-4">Pass Rate</th>
                              <th className="py-3.5 px-4">Avg Accuracy</th>
                              <th className="py-3.5 px-5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {displayedTests.map((t) => (
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
                                <td className="py-3.5 px-4 text-blue-600 font-semibold">
                                  {t.inProgressAttempts || 0}
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
                  </div>
                )}

                {/* Tab 2: Student Performance Report */}
                {activeTab === 'students' && (
                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="py-16 text-center text-xs text-slate-400">Loading student report...</div>
                    ) : displayedStudents.length === 0 ? (
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
                          {displayedStudents.map((s) => (
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
                    {statusFilter === 'unattempted' ? (
                      // Sub-view: Unattempted Students for Selected Test
                      !selectedTestId ? (
                        <div className="py-20 text-center space-y-3">
                          <div className="inline-flex p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                            <AlertCircle className="w-6 h-6" />
                          </div>
                          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Select a Mock Test to View Unattempted Candidates
                          </h3>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Please choose a mock test from the dropdown above to view eligible students who have not yet taken it.
                          </p>
                        </div>
                      ) : unattemptedLoading ? (
                        <div className="py-16 text-center text-xs text-slate-400">Loading unattempted students...</div>
                      ) : displayedUnattempted.length === 0 ? (
                        <div className="py-16 text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          Excellent! All eligible students have attempted "{selectedTestObj?.title || 'Selected Test'}".
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                              <th className="py-3.5 px-5">Candidate Name</th>
                              <th className="py-3.5 px-4">Student ID</th>
                              <th className="py-3.5 px-4">Department</th>
                              <th className="py-3.5 px-4">Graduation Year</th>
                              <th className="py-3.5 px-5">Participation Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {displayedUnattempted.map((s) => (
                              <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                                <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                                  {s.name}
                                  <span className="text-[11px] text-slate-400 block font-normal">{s.email}</span>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">{s.studentId}</td>
                                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">{s.department}</td>
                                <td className="py-3.5 px-4 text-slate-500">{s.graduationYear}</td>
                                <td className="py-3.5 px-5">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                                    <AlertCircle className="w-3 h-3" />
                                    Unattempted
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )
                    ) : (
                      // Standard Participation overview table
                      loading ? (
                        <div className="py-16 text-center text-xs text-slate-400">Loading participation report...</div>
                      ) : displayedTests.length === 0 ? (
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
                            {displayedTests.map((t) => {
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
                      )
                    )}
                  </div>
                )}
              </div>
    </div>
        );
}
