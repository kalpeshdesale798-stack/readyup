import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  GraduationCap,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Award,
  AlertCircle,
  TrendingUp,
  X,
  BookOpen
} from 'lucide-react';
import { coordinatorService } from '../services/coordinatorService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';
import AttemptReviewModal from '../components/coordinator/AttemptReviewModal';

export default function CoordinatorStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  // Student Profile Detail Drawer / Modal
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Attempt Review Modal
  const [reviewAttempt, setReviewAttempt] = useState(null);

  const { addToast } = useToast();

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await coordinatorService.getStudents({
        search: search || undefined,
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        graduationYear: yearFilter !== 'all' ? yearFilter : undefined
      });
      setStudents(res.data || []);
    } catch (err) {
      console.error('Failed to load students:', err);
      addToast({ title: 'Error', message: 'Failed to load students directory', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [departmentFilter, yearFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadStudents();
  };

  const handleOpenStudentDetail = async (studentId) => {
    setActiveStudentId(studentId);
    setDetailLoading(true);
    try {
      const res = await coordinatorService.getStudentDetail(studentId);
      setStudentDetail(res);
    } catch (err) {
      console.error('Failed to load student details:', err);
      addToast({ title: 'Error', message: 'Failed to load student profile details', type: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 text-teal-800 dark:text-teal-300 text-xs font-bold tracking-wider uppercase mb-1">
          <GraduationCap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          STUDENT APTITUDE PERFORMANCE DIRECTORY
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Student Performance & Attempt Profiles
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Search registered students, inspect individual test completion rates, analyze strong/weak topics, and track campus placement readiness.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate by name, email, or student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-200"
          />
        </form>

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
            <span className="text-xs text-slate-500 font-medium">Graduation Year:</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Batches</option>
              <option value="2026">2026 Batch</option>
              <option value="2027">2027 Batch</option>
              <option value="2025">2025 Batch</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-100 dark:border-slate-800 card-shadow overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-400">Loading student directory and attempt stats...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No students found</p>
            <p className="text-xs text-slate-400 mt-1">Try modifying your search or department filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3.5 px-5">Candidate Name</th>
                  <th className="py-3.5 px-4">Student ID</th>
                  <th className="py-3.5 px-4">Department & Batch</th>
                  <th className="py-3.5 px-4">Mock Tests Attempted</th>
                  <th className="py-3.5 px-4">Completed</th>
                  <th className="py-3.5 px-4">Avg Accuracy</th>
                  <th className="py-3.5 px-4">Last Activity</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {student.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {student.email}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {student.studentId || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {student.department}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Class of {student.graduationYear}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {student.testsAttempted}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {student.testsCompleted} done
                      </span>
                      {student.passedCount > 0 && (
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({student.passedCount} passed)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold">
                      {student.testsCompleted > 0 ? (
                        <span className={student.avgAccuracy >= 60 ? 'text-emerald-600' : 'text-rose-600'}>
                          {student.avgAccuracy}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {student.lastAttemptDate
                        ? new Date(student.lastAttemptDate).toLocaleDateString()
                        : 'Never attempted'}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleOpenStudentDetail(student._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Profile</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Profile & History Modal */}
      {activeStudentId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  STUDENT PROFILE & ATTEMPT AUDIT
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {studentDetail?.student?.name || 'Student Profile'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {studentDetail?.student?.department} • ID: {studentDetail?.student?.studentId} • Batch {studentDetail?.student?.graduationYear}
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveStudentId(null);
                  setStudentDetail(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {detailLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-400">Loading student attempts and topic diagnostics...</p>
                </div>
              ) : studentDetail ? (
                <>
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50">
                      <div className="text-[11px] font-medium text-teal-700 dark:text-teal-400">Total Attempts</div>
                      <div className="text-xl font-extrabold text-teal-900 dark:text-teal-200 mt-0.5">
                        {studentDetail.summary?.totalAttempts || 0}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                      <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Completed & Passed</div>
                      <div className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-0.5">
                        {studentDetail.summary?.passedCount || 0} / {studentDetail.summary?.completedAttempts || 0}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50">
                      <div className="text-[11px] font-medium text-sky-700 dark:text-sky-400">Avg Accuracy</div>
                      <div className="text-xl font-extrabold text-sky-900 dark:text-sky-200 mt-0.5">
                        {studentDetail.summary?.avgAccuracy || 0}%
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
                      <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Pass Rate</div>
                      <div className="text-xl font-extrabold text-amber-900 dark:text-amber-200 mt-0.5">
                        {studentDetail.summary?.passRate || 0}%
                      </div>
                    </div>
                  </div>

                  {/* Topic Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Strong Aptitude Topics
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {(studentDetail.strongTopics || []).length === 0 ? (
                          <span className="text-xs text-slate-400">Needs more mock test data</span>
                        ) : (
                          studentDetail.strongTopics.map((t) => (
                            <span key={t.topic} className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
                              {t.topic} ({t.accuracy}%)
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
                      <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        Topics Needing Support
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {(studentDetail.weakTopics || []).length === 0 ? (
                          <span className="text-xs text-slate-400">No critical weak topics identified</span>
                        ) : (
                          studentDetail.weakTopics.map((t) => (
                            <span key={t.topic} className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 text-xs font-semibold">
                              {t.topic} ({t.accuracy}%)
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Complete Mock-Test Attempt History */}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">
                      Complete Mock-Test Attempt History
                    </h4>

                    {(studentDetail.attempts || []).length === 0 ? (
                      <p className="text-xs text-slate-400">No test attempts recorded for this candidate.</p>
                    ) : (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                              <th className="py-3 px-3">Test Title</th>
                              <th className="py-3 px-3">Score</th>
                              <th className="py-3 px-3">Accuracy</th>
                              <th className="py-3 px-3">Status</th>
                              <th className="py-3 px-3">Date</th>
                              <th className="py-3 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {studentDetail.attempts.map((att) => (
                              <tr key={att._id || att.attemptId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                  {att.title}
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
                                <td className="py-3 px-3 text-slate-500">
                                  {new Date(att.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {att.status === 'completed' && (
                                    <button
                                      onClick={() =>
                                        setReviewAttempt({
                                          attemptId: att.attemptId || att._id,
                                          studentName: studentDetail.student?.name,
                                          studentId: studentDetail.student?.studentId,
                                          department: studentDetail.student?.department
                                        })
                                      }
                                      className="px-3 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 font-bold text-xs cursor-pointer"
                                    >
                                      Inspect Answers
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
              <button
                onClick={() => {
                  setActiveStudentId(null);
                  setStudentDetail(null);
                }}
                className="px-5 py-2 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Answer Review Modal */}
      {reviewAttempt && (
        <AttemptReviewModal
          attemptId={reviewAttempt.attemptId}
          studentInfo={reviewAttempt}
          onClose={() => setReviewAttempt(null)}
        />
      )}
    </div>
  );
}
