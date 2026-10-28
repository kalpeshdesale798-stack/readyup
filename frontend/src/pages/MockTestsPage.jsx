import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Timer,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Award,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building2,
  Filter,
  Calendar,
  X
} from 'lucide-react';
import { testService } from '../services/testService';
import { companyService } from '../services/companyService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

export default function MockTestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const companyQuery = searchParams.get('company') || '';
  const typeQuery = searchParams.get('type') || 'all';

  const [mockTests, setMockTests] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedType, setSelectedType] = useState(typeQuery);
  const [selectedCompany, setSelectedCompany] = useState(companyQuery);
  const [loading, setLoading] = useState(true);

  // Modal for test start confirmation & instructions
  const [selectedTest, setSelectedTest] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  const navigate = useNavigate();
  const { addToast } = useToast();

  // Sync state if URL search parameters change (e.g. browser back/forward)
  useEffect(() => {
    const cParam = searchParams.get('company') || '';
    const tParam = searchParams.get('type') || 'all';
    setSelectedCompany(cParam);
    setSelectedType(tParam);
  }, [searchParams]);

  // Load companies for the filter bar
  useEffect(() => {
    async function loadCompanies() {
      try {
        const compList = await companyService.getCompanies();
        setCompanies(compList || []);
      } catch (err) {
        console.error('Failed to load companies for filter:', err);
      }
    }
    loadCompanies();
  }, []);

  // Fetch mock tests whenever selectedType or selectedCompany changes
  useEffect(() => {
    async function loadTests() {
      setLoading(true);
      try {
        const params = {};
        if (selectedType && selectedType !== 'all') {
          params.type = selectedType;
        }
        if (selectedCompany) {
          params.company = selectedCompany;
        }
        const res = await testService.getMockTests(params);
        // Phase 6 duplicate prevention: Ensure strictly one card per unique test ID
        const unique = [];
        const seen = new Set();
        (res || []).forEach((t) => {
          const id = String(t._id || t.id);
          if (id && !seen.has(id)) {
            seen.add(id);
            unique.push(t);
          }
        });
        setMockTests(unique);
      } catch (err) {
        console.error('Failed to load mock tests:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTests();
  }, [selectedType, selectedCompany]);

  // If testId is provided in URL (e.g. from notification click), open test details modal
  useEffect(() => {
    const testIdParam = searchParams.get('testId');
    if (testIdParam && mockTests.length > 0) {
      const target = mockTests.find((t) => String(t._id) === String(testIdParam));
      if (target) {
        setSelectedTest(target);
      }
    }
  }, [searchParams, mockTests]);

  const handleTabChange = (typeVal) => {
    setSelectedType(typeVal);
    const newParams = {};
    if (typeVal !== 'all') newParams.type = typeVal;
    if (selectedCompany) newParams.company = selectedCompany;
    setSearchParams(newParams);
  };

  const handleCompanyChange = (compName) => {
    setSelectedCompany(compName);
    const newParams = {};
    if (selectedType !== 'all') newParams.type = selectedType;
    if (compName) newParams.company = compName;
    setSearchParams(newParams);
  };

  const handleClearCompany = () => {
    setSelectedCompany('');
    const newParams = {};
    if (selectedType !== 'all') newParams.type = selectedType;
    setSearchParams(newParams);
  };

  const getTestSchedule = (t) => {
    const start = t.startDate || t.startTime || null;
    const end = t.endDate || t.deadline || null;
    const now = new Date();
    const isUpcoming = t.scheduleStatus === 'upcoming' || (start && now < new Date(start));
    const isClosed = t.scheduleStatus === 'closed' || (end && now > new Date(end));
    return { start, end, isUpcoming, isClosed };
  };

  const handleStartTest = async (test) => {
    const { start, end, isUpcoming, isClosed } = getTestSchedule(test);

    if (isUpcoming) {
      addToast({
        title: 'Assessment Not Open Yet',
        message: `This assessment opens on ${start ? new Date(start).toLocaleString() : 'a scheduled date'}.`,
        type: 'warning'
      });
      return;
    }

    if (isClosed) {
      addToast({
        title: 'Assessment Window Closed',
        message: 'The deadline for this assessment has already passed.',
        type: 'error'
      });
      return;
    }

    setIsStarting(true);
    try {
      const session = await testService.startMockTest(test._id);
      addToast({
        title: 'Mock Test Started',
        message: `${session.title} • Timer running`,
        type: 'info'
      });
      setSelectedTest(null);
      navigate(`/tests/take/${session.attemptId}`, { state: { session } });
    } catch (err) {
      addToast({
        title: 'Could not launch mock test',
        message: err.message,
        type: 'error'
      });
    } finally {
      setIsStarting(false);
    }
  };

  // Safe client-side fallback filtering
  const filteredTests = mockTests.filter((t) => {
    const matchesType =
      selectedType === 'all' ||
      t.type === selectedType ||
      (selectedType === 'company_mock' && (t.type === 'company' || t.type === 'company_mock')) ||
      (selectedType === 'topic_test' && (t.type === 'topic' || t.type === 'topic_test' || t.type === 'grand')) ||
      (selectedType === 'diagnostic' && t.type === 'diagnostic');

    const matchesCompany =
      !selectedCompany ||
      (t.company && t.company.toLowerCase() === selectedCompany.toLowerCase());

    return matchesType && matchesCompany;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
            EXAM SIMULATION
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Full-Length Mock Tests
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Standardized placement assessments with live timers and authoritative server evaluation
          </p>
        </div>

        {selectedCompany && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-medium text-slate-500">Filtered for:</span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              <span>{selectedCompany}</span>
              <button
                onClick={handleClearCompany}
                className="hover:text-rose-500 transition-colors ml-1 cursor-pointer"
                title="Clear company filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Controls Bar */}
      <div className="space-y-4">
        {/* Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { label: 'All Assessments', value: 'all' },
              { label: 'Company Mocks', value: 'company_mock' },
              { label: 'Topic Tests', value: 'topic_test' },
              { label: 'Diagnostic Assessments', value: 'diagnostic' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${selectedType === tab.value
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Company Filter Dropdown (visible on All Assessments & Company Mocks) */}
          {(selectedType === 'all' || selectedType === 'company_mock') && companies.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 hidden sm:inline">Company:</span>
              <select
                value={selectedCompany}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-teal-500 cursor-pointer"
              >
                <option value="">All Companies</option>
                {companies.map((c) => (
                  <option key={c._id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTests.length === 0 && (
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-800 card-shadow space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center mx-auto">
            <Timer className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No assessments found
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1">
              {selectedCompany
                ? `No full mock tests currently configured for ${selectedCompany}. You can reset the filter or start a 10-question practice drill.`
                : 'No assessments available under this tab.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {selectedCompany && (
              <button
                onClick={handleClearCompany}
                className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                Show All Companies
              </button>
            )}
            <button
              onClick={() => handleTabChange('all')}
              className="px-5 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
            >
              View All Assessments
            </button>
          </div>
        </div>
      )}

      {/* Test Cards Grid */}
      {!loading && filteredTests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => {
            const isCompleted = test.userAttempt?.status === 'completed';
            const isInProgress = test.userAttempt?.status === 'in-progress';
            const { start, end, isUpcoming, isClosed } = getTestSchedule(test);

            return (
              <div
                key={test._id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow hover:card-shadow-hover transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={test.company === 'General' || !test.company ? 'neutral' : 'teal'}>
                      {test.company || 'General'}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <Badge variant="emerald">Completed</Badge>
                      ) : isInProgress ? (
                        <Badge variant="amber">In Progress</Badge>
                      ) : isUpcoming ? (
                        <Badge variant="purple">Upcoming</Badge>
                      ) : isClosed ? (
                        <Badge variant="danger">Closed</Badge>
                      ) : (
                        <Badge variant="teal">Live</Badge>
                      )}
                      <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>{test.durationMinutes} mins</span>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                    {test.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                    {test.description || 'Verified campus placement assessment simulation.'}
                  </p>

                  {/* Schedule Details if test has start or end dates */}
                  {(start || end) && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                      {start && (
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3 text-teal-600" /> Starts:
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {new Date(start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      {end && (
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-rose-500" /> Deadline:
                          </span>
                          <span className={`font-semibold ${isClosed ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {new Date(end).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Questions:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {test.totalQuestions} Questions
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Total Marks:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {test.totalMarks} Marks
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Passing Cutoff:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {test.passingMarks} Marks ({test.passingScore || 60}%)
                      </span>
                    </div>
                    {isCompleted && test.userAttempt && (
                      <div className="flex justify-between text-slate-500 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">Your Score:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {test.userAttempt.score} / {test.totalMarks} ({Math.round(((test.userAttempt.score || 0) / (test.totalMarks || 1)) * 100)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {isCompleted ? 'Attempt submitted' : isUpcoming ? 'Scheduled test' : isClosed ? 'Window closed' : 'Exam format verified'}
                  </span>

                  {isCompleted ? (
                    <button
                      onClick={() => navigate(`/tests/review/${test.userAttempt.attemptId}`)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Review Result</span>
                    </button>
                  ) : isInProgress ? (
                    <button
                      onClick={() => navigate(`/tests/take/${test.userAttempt.attemptId}`)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <span>Resume Test</span>
                      <Play className="w-3 h-3 fill-white" />
                    </button>
                  ) : isUpcoming ? (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold cursor-not-allowed border border-slate-200 dark:border-slate-700"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Opens {start ? new Date(start).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Soon'}</span>
                    </button>
                  ) : isClosed ? (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold cursor-not-allowed border border-slate-200 dark:border-slate-700"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>Closed</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedTest(test)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <span>Instructions</span>
                      <Play className="w-3 h-3 fill-white" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Instructions & Confirmation Dialog */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                  TEST INSTRUCTIONS & RULES
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedTest.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTest(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40">
                <div>
                  <span className="text-[11px] text-teal-700 dark:text-teal-400 block font-medium">Duration</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedTest.durationMinutes} Mins</span>
                </div>
                <div>
                  <span className="text-[11px] text-teal-700 dark:text-teal-400 block font-medium">Questions</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedTest.totalQuestions}</span>
                </div>
                <div>
                  <span className="text-[11px] text-teal-700 dark:text-teal-400 block font-medium">Pass Cutoff</span>
                  <span className="text-sm font-bold text-emerald-600">{selectedTest.passingMarks} Marks</span>
                </div>
              </div>

              {/* Schedule timing window in modal if present */}
              {(selectedTest.startDate || selectedTest.startTime || selectedTest.endDate || selectedTest.deadline) && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 text-xs space-y-1">
                  {(selectedTest.startDate || selectedTest.startTime) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Available From:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(selectedTest.startDate || selectedTest.startTime).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {(selectedTest.endDate || selectedTest.deadline) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Submission Deadline:</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {new Date(selectedTest.endDate || selectedTest.deadline).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  Important Guidelines:
                </span>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  {(selectedTest.instructions || [
                    'Each question carries 1 mark. There is no negative marking.',
                    'The countdown timer starts as soon as you launch the test.',
                    'Do not refresh or navigate away from the browser during the assessment.'
                  ]).map((inst, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                      <span>{inst}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedTest(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isStarting ||
                  selectedTest.scheduleStatus === 'upcoming' ||
                  ((selectedTest.startDate || selectedTest.startTime) && new Date() < new Date(selectedTest.startDate || selectedTest.startTime)) ||
                  selectedTest.scheduleStatus === 'closed' ||
                  ((selectedTest.endDate || selectedTest.deadline) && new Date() > new Date(selectedTest.endDate || selectedTest.deadline))
                }
                onClick={() => handleStartTest(selectedTest)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <span>{isStarting ? 'Starting Timer...' : 'Start Mock Test Now'}</span>
                <Play className="w-3.5 h-3.5 fill-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
