import { useState, useEffect } from 'react';
import {
  Timer,
  Search,
  Filter,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Eye,
  Award,
  ChevronRight,
  Plus,
  X,
  Send,
  Building2,
  Sparkles,
  Trash2,
  Edit3
} from 'lucide-react';
import { coordinatorService } from '../services/coordinatorService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';
import AttemptReviewModal from '../components/coordinator/AttemptReviewModal';
import CreateMockTestWizard from '../components/coordinator/CreateMockTestWizard';
import ArchiveTestModal from '../components/coordinator/ArchiveTestModal';

export default function CoordinatorMockTestsPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Unified Wizard and Archive states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [testToEdit, setTestToEdit] = useState(null);
  const [testToArchive, setTestToArchive] = useState(null);

  // Test Attempts Drawer / Modal
  const [activeTestForAttempts, setActiveTestForAttempts] = useState(null);
  const [testAttempts, setTestAttempts] = useState([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptSearch, setAttemptSearch] = useState('');
  const [attemptStatusFilter, setAttemptStatusFilter] = useState('all');

  // Question Review Modal
  const [selectedAttemptForReview, setSelectedAttemptForReview] = useState(null);

  // Test Assignment / Scheduling Modal
  const [assigningTest, setAssigningTest] = useState(null);
  const [assignBatches, setAssignBatches] = useState('');
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignEndDate, setAssignEndDate] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  const { addToast } = useToast();

  const loadTests = async () => {
    setLoading(true);
    try {
      const res = await coordinatorService.getMockTests({
        search: search || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      setTests(res.data || []);
    } catch (err) {
      console.error('Failed to load mock tests:', err);
      addToast({ title: 'Error', message: 'Failed to load mock tests monitoring data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTests();
  };

  // Publish Draft Test
  const handlePublishDraft = async (test) => {
    try {
      await coordinatorService.publishMockTest(test._id);
      addToast({
        title: 'Mock Test Published',
        message: `'${test.title}' is now published and visible to eligible students.`,
        type: 'success'
      });
      loadTests();
    } catch (err) {
      addToast({
        title: 'Cannot Publish Draft',
        message: err.message || 'Please review required fields before publishing.',
        type: 'error'
      });
      try {
        const details = await coordinatorService.getMockTestDetail(test._id);
        setTestToEdit(details);
        setIsCreateModalOpen(true);
      } catch {
        setTestToEdit(test);
        setIsCreateModalOpen(true);
      }
    }
  };

  // Open Attempts Drawer
  const handleOpenAttempts = async (test) => {
    setActiveTestForAttempts(test);
    setAttemptsLoading(true);
    try {
      const res = await coordinatorService.getMockTestAttempts(test._id, {
        search: attemptSearch || undefined,
        status: attemptStatusFilter !== 'all' ? attemptStatusFilter : undefined
      });
      setTestAttempts(res.data || []);
    } catch (err) {
      console.error('Failed to load test attempts:', err);
      addToast({ title: 'Error', message: 'Failed to load attempts for this test', type: 'error' });
    } finally {
      setAttemptsLoading(false);
    }
  };

  // Open Assignment Modal
  const handleOpenAssignModal = (test) => {
    setAssigningTest(test);
    setAssignBatches((test.assignedBatches || []).join(', '));
    setAssignStartDate(test.startDate ? new Date(test.startDate).toISOString().slice(0, 16) : '');
    setAssignEndDate(test.endDate ? new Date(test.endDate).toISOString().slice(0, 16) : '');
    setIsScheduled(Boolean(test.isScheduled));
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!assigningTest) return;
    setIsSubmittingAssign(true);
    try {
      const batchList = assignBatches
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean);

      await coordinatorService.assignMockTest(assigningTest._id, {
        assignedBatches: batchList,
        startDate: assignStartDate ? new Date(assignStartDate).toISOString() : null,
        endDate: assignEndDate ? new Date(assignEndDate).toISOString() : null,
        isScheduled
      });

      addToast({
        title: 'Assignment Saved',
        message: `Successfully scheduled '${assigningTest.title}'`,
        type: 'success'
      });
      setAssigningTest(null);
      loadTests();
    } catch (err) {
      addToast({ title: 'Error', message: err.message || 'Failed to update assignment', type: 'error' });
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 text-teal-800 dark:text-teal-300 text-xs font-bold tracking-wider uppercase mb-1">
            <Timer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            PLACEMENT SIMULATION MONITORING
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Mock-Test Monitoring & Scheduling
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor test participation, identify pending candidates, schedule availability windows, and inspect student answer breakdowns.
          </p>
        </div>

        <button
          onClick={() => {
            setTestToEdit(null);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Mock Test</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search test by title, company, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-200"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Saved Drafts</option>
              <option value="active">Active Tests</option>
              <option value="upcoming">Upcoming</option>
              <option value="closed">Closed / Past Deadline</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Categories</option>
              <option value="Mixed">Mixed Aptitude</option>
              <option value="Quantitative">Quantitative</option>
              <option value="Logical">Logical Reasoning</option>
              <option value="Verbal">Verbal Ability</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tests Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-100 dark:border-slate-800 card-shadow overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-400">Loading mock tests and participation counts...</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No mock tests found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3.5 px-5">Mock Test Title</th>
                  <th className="py-3.5 px-4">Pattern / Company</th>
                  <th className="py-3.5 px-4">Duration & Qs</th>
                  <th className="py-3.5 px-4">Candidates Attempted</th>
                  <th className="py-3.5 px-4">Completed / Active</th>
                  <th className="py-3.5 px-4">Pending</th>
                  <th className="py-3.5 px-4">Avg Accuracy</th>
                  <th className="py-3.5 px-4">Schedule</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tests.map((test) => (
                  <tr key={test._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900 dark:text-white text-sm max-w-xs sm:max-w-md">
                        {test.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {test.category}
                        </span>
                        {test.assignedDepartments?.length > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900">
                            {test.assignedDepartments.includes('ALL') ? 'All Depts' : test.assignedDepartments.join(', ')}
                          </span>
                        )}
                        {test.status === 'draft' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                            Draft
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {test.company || 'General'}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-slate-900 dark:text-slate-200 font-medium">
                        {test.durationMinutes} mins
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {test.totalQuestions} questions ({test.totalMarks || test.totalQuestions} marks)
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {test.uniqueStudentsAttempted} unique
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ({test.totalAttempts} total attempts)
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {test.completedAttempts} done
                        </span>
                        {test.inProgressAttempts > 0 && (
                          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                            ({test.inProgressAttempts} active)
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      <span
                        className={`font-bold ${
                          test.unattemptedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {test.unattemptedCount}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        of {test.eligibleStudentsCount} eligible
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {test.averageAccuracy}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {test.passRate}% pass rate
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <Badge
                        variant={
                          test.scheduleStatus === 'upcoming'
                            ? 'Needs Review'
                            : test.scheduleStatus === 'closed'
                              ? 'Incomplete'
                              : 'Passed'
                        }
                      >
                        {test.scheduleStatus}
                      </Badge>
                      {test.endDate && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          Deadline: {new Date(test.endDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right space-x-1.5 whitespace-nowrap">
                      {test.status === 'draft' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handlePublishDraft(test)}
                            title="Publish Draft to Students"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Publish</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const details = await coordinatorService.getMockTestDetail(test._id);
                                setTestToEdit(details);
                                setIsCreateModalOpen(true);
                              } catch {
                                setTestToEdit(test);
                                setIsCreateModalOpen(true);
                              }
                            }}
                            title="Edit Draft Details & Questions"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                            <span>Edit Draft</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTestToArchive(test)}
                            title="Delete Saved Draft"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenAttempts(test)}
                            title="View Candidates & Attempts"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Attempts</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(test)}
                            title="Configure Schedule & Targets"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>Schedule</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const details = await coordinatorService.getMockTestDetail(test._id);
                                setTestToEdit(details);
                                setIsCreateModalOpen(true);
                              } catch {
                                setTestToEdit(test);
                                setIsCreateModalOpen(true);
                              }
                            }}
                            title="Edit Mock Test"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTestToArchive(test)}
                            title="Archive Mock Test Safely"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Archive</span>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attempt Review Modal */}
      {selectedAttemptForReview && (
        <AttemptReviewModal
          attemptId={selectedAttemptForReview.attemptId}
          studentInfo={selectedAttemptForReview}
          onClose={() => setSelectedAttemptForReview(null)}
        />
      )}

      {/* Test Student-Wise Attempts Drawer / Modal */}
      {activeTestForAttempts && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  STUDENT RESULTS & ATTEMPTS
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {activeTestForAttempts.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {activeTestForAttempts.durationMinutes} mins • {activeTestForAttempts.totalQuestions} questions • Passing: {activeTestForAttempts.passingScore}%
                </p>
              </div>

              <button
                onClick={() => setActiveTestForAttempts(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {attemptsLoading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Loading student attempts...</p>
                </div>
              ) : testAttempts.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No candidate attempts recorded for this test.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3 px-3">Student Name</th>
                      <th className="py-3 px-3">Student ID</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Attempt #</th>
                      <th className="py-3 px-3">Score</th>
                      <th className="py-3 px-3">Accuracy</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Submitted At</th>
                      <th className="py-3 px-3 text-right">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {testAttempts.map((att) => (
                      <tr key={att._id || att.attemptId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                          {att.studentName}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {att.studentId}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {att.department}
                        </td>
                        <td className="py-3 px-3 font-mono text-center font-bold text-slate-700 dark:text-slate-300">
                          #{att.attemptNumber || 1}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {att.status === 'completed' ? `${att.score} / ${att.totalMarks}` : '—'}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                          {att.status === 'completed' ? `${att.accuracy}%` : '—'}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={att.status === 'completed' ? (att.result === 'Passed' ? 'Passed' : 'Needs Review') : 'Pending'}>
                            {att.status === 'completed' ? att.result || 'Completed' : 'In Progress'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {att.submissionTime ? new Date(att.submissionTime).toLocaleDateString() : 'Active'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {att.status === 'completed' ? (
                            <button
                              onClick={() => setSelectedAttemptForReview(att)}
                              className="px-3 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 font-bold text-xs cursor-pointer"
                            >
                              Inspect Answers
                            </button>
                          ) : (
                            <span className="text-[11px] text-purple-600 font-semibold">Active</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
              <button
                onClick={() => setActiveTestForAttempts(null)}
                className="px-5 py-2 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment / Scheduling Modal */}
      {assigningTest && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  TEST ASSIGNMENT & DEADLINE
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {assigningTest.title}
                </h3>
              </div>
              <button
                onClick={() => setAssigningTest(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-5 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Batches / Departments (comma-separated):
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2026, Computer Science & Engineering, Information Technology"
                  value={assignBatches}
                  onChange={(e) => setAssignBatches(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank to make test available to all active enrolled students.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date & Time (Optional):
                  </label>
                  <input
                    type="datetime-local"
                    value={assignStartDate}
                    onChange={(e) => setAssignStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Deadline (End Date):
                  </label>
                  <input
                    type="datetime-local"
                    value={assignEndDate}
                    onChange={(e) => setAssignEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Active Assignment Notification</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Notify eligible students immediately on their portal dashboard.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssigningTest(null)}
                  className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssign}
                  className="px-5 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAssign ? 'Saving...' : 'Save & Publish Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Unified Mock Test Wizard */}
      <CreateMockTestWizard
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setTestToEdit(null);
        }}
        onTestCreated={loadTests}
        editTest={testToEdit}
      />

      {/* Safe Archive Modal */}
      <ArchiveTestModal
        isOpen={Boolean(testToArchive)}
        onClose={() => setTestToArchive(null)}
        test={testToArchive}
        onTestArchived={loadTests}
      />
    </div>
  );
}
