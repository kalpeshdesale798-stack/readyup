import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Clock,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X
} from 'lucide-react';
import { testService } from '../services/testService';
import { bookmarkService } from '../services/bookmarkService';
import { useToast } from '../context/ToastContext';
import { useActiveTest } from '../context/ActiveTestContext';
import Badge from '../components/common/Badge';

export default function ActiveMockTestPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const { registerActiveTest, unregisterActiveTest } = useActiveTest();

  const [session, setSession] = useState(location.state?.session || null);
  const [loading, setLoading] = useState(!session);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(30 * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);
  const isSubmittedRef = useRef(false);
  const submitAndLeaveRef = useRef();

  const storageKey = `readyup_test_state_${attemptId || session?.attemptId || 'active'}`;

  // Loading safety timeout
  useEffect(() => {
    if (!loading) {
      setLoadTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      setLoadTimedOut(true);
    }, 12000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Register active test with context to intercept sidebar navigation
  useEffect(() => {
    if (loading || !session || isSubmittedRef.current) return;

    registerActiveTest({
      attemptId: session.attemptId || attemptId,
      testType: 'mock',
      submitAndLeave: (dest) => submitAndLeaveRef.current(dest)
    });

    return () => {
      unregisterActiveTest(session.attemptId || attemptId);
    };
  }, [loading, session, attemptId, registerActiveTest, unregisterActiveTest]);

  // Initialize test session
  useEffect(() => {
    async function initSession() {
      if (!session) {
        try {
          if (attemptId && attemptId !== 'active') {
            const attemptData = await testService.getAttempt(attemptId);
            if (attemptData) {
              if (attemptData.status === 'completed' || attemptData.isSubmitted) {
                try {
                  sessionStorage.removeItem(storageKey);
                } catch (_) { }
                addToast({
                  title: 'Already Submitted',
                  message: 'This test was already submitted. Redirecting to your results...',
                  type: 'info'
                });
                navigate(`/tests/review/${attemptId}`, { replace: true, state: { result: attemptData } });
                return;
              }
              setSession(attemptData);
              const duration = (attemptData.durationMinutes || 45) * 60;
              setRemainingSeconds(typeof attemptData.remainingSeconds === 'number' ? attemptData.remainingSeconds : duration);
              if (attemptData.answers && Object.keys(attemptData.answers).length > 0) {
                setAnswers(attemptData.answers);
              }
              setLoading(false);
              return;
            }
          }
          // If no state passed and no valid attemptId, load standard mock
          const newSession = await testService.startMockTest('mock_tcs_01');
          setSession(newSession);
          const duration = (newSession.durationMinutes || 45) * 60;
          setRemainingSeconds(duration);
        } catch (err) {
          addToast({ title: 'Error', message: err.message || 'Failed to initialize mock test', type: 'error' });
          navigate('/tests');
        } finally {
          setLoading(false);
        }
      } else {
        const duration = (session.durationMinutes || 45) * 60;
        setRemainingSeconds(typeof session.remainingSeconds === 'number' ? session.remainingSeconds : duration);
        setLoading(false);
      }
    }
    initSession();
  }, [session, attemptId, navigate, addToast]);

  // Restore persisted progress on reload / revisit
  useEffect(() => {
    if (loading || !session || hasLoadedSavedState) return;

    try {
      const savedRaw = sessionStorage.getItem(storageKey);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved && (saved.attemptId === (session.attemptId || attemptId) || !saved.attemptId)) {
          if (saved.answers && typeof saved.answers === 'object') {
            setAnswers(saved.answers);
          }
          if (typeof saved.currentIndex === 'number' && saved.currentIndex >= 0) {
            setCurrentIndex(saved.currentIndex);
          }
          if (typeof saved.remainingSeconds === 'number' && saved.remainingSeconds > 0) {
            setRemainingSeconds(saved.remainingSeconds);
          }
          if (saved.isPaused) {
            setIsPaused(true);
          }
        }
      }
    } catch (e) {
      console.warn('Could not restore saved test state:', e);
    } finally {
      setHasLoadedSavedState(true);
    }
  }, [loading, session, hasLoadedSavedState, storageKey, attemptId]);

  // Persist test state to sessionStorage whenever answers, position, or pause state change
  useEffect(() => {
    if (loading || !session || isSubmittedRef.current || !hasLoadedSavedState) return;

    try {
      const stateToCache = {
        attemptId: session.attemptId || attemptId,
        answers,
        currentIndex,
        remainingSeconds,
        isPaused
      };
      sessionStorage.setItem(storageKey, JSON.stringify(stateToCache));
    } catch (_) { }
  }, [answers, currentIndex, remainingSeconds, isPaused, loading, session, hasLoadedSavedState, storageKey, attemptId]);

  // Test Integrity: Tab visibility change & beforeunload protection
  useEffect(() => {
    if (loading || !session) return;

    const handleVisibilityChange = () => {
      if (isSubmittedRef.current) return;
      if (document.visibilityState === 'hidden') {
        setIsPaused(true);
      }
    };

    const handleBeforeUnload = (e) => {
      if (isSubmittedRef.current) return;
      try {
        const stateToCache = {
          attemptId: session.attemptId || attemptId,
          answers,
          currentIndex,
          remainingSeconds,
          isPaused: true
        };
        sessionStorage.setItem(storageKey, JSON.stringify(stateToCache));
      } catch (_) { }

      e.preventDefault();
      e.returnValue = 'Your test is actively in progress. Leaving or refreshing will pause the test.';
      return e.returnValue;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loading, session, answers, currentIndex, remainingSeconds, storageKey, attemptId]);

  // Countdown timer (pauses automatically when isPaused is true)
  useEffect(() => {
    if (loading || remainingSeconds <= 0 || isPaused) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!isSubmittedRef.current) {
            handleAutoSubmitOnExpire();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, remainingSeconds, isPaused]);

  const handleAutoSubmitOnExpire = () => {
    addToast({
      title: 'Time Expired!',
      message: 'Submitting your responses automatically...',
      type: 'warning'
    });
    performSubmit();
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const questions = session?.questions || [];
  const currentQ = questions[currentIndex];
  const currentAnswer = currentQ ? (answers[currentQ.questionId] || { selectedOption: null, markedForReview: false }) : {};

  const handleSelectOption = (optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.questionId]: {
        ...prev[currentQ.questionId],
        selectedOption: optionId,
        timeSpentSeconds: (prev[currentQ.questionId]?.timeSpentSeconds || 0) + 10
      }
    }));
  };

  const handleClearOption = () => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.questionId]: {
        ...prev[currentQ.questionId],
        selectedOption: null
      }
    }));
  };

  const handleToggleMarkReview = async () => {
    const isCurrentlyMarked = Boolean(answers[currentQ.questionId]?.markedForReview);
    setAnswers((prev) => ({
      ...prev,
      [currentQ.questionId]: {
        ...prev[currentQ.questionId],
        markedForReview: !isCurrentlyMarked
      }
    }));

    try {
      if (!isCurrentlyMarked) {
        await bookmarkService.addBookmark(currentQ.questionId, 'Marked for Review');
      } else {
        await bookmarkService.removeBookmark(currentQ.questionId);
      }
    } catch (err) {
      console.error('Failed to sync bookmark:', err);
    }
  };

  submitAndLeaveRef.current = async (destination) => {
    return await performSubmit({ redirectOverride: destination });
  };

  const performSubmit = async (options = {}) => {
    const { redirectOverride } = options;
    if (isSubmittedRef.current) return false;
    isSubmittedRef.current = true;
    setIsSubmitting(true);

    try {
      const formattedAnswers = questions.map((q) => {
        const item = answers[q.questionId];
        return {
          questionId: q.questionId,
          selectedOption: item?.selectedOption || null,
          timeSpentSeconds: item?.timeSpentSeconds || 15,
          markedForReview: Boolean(item?.markedForReview)
        };
      });

      const result = await testService.submitAttempt(session.attemptId || attemptId, formattedAnswers);
      try {
        sessionStorage.removeItem(storageKey);
      } catch (_) { }
      addToast({
        title: 'Mock Test Scored',
        message: `Your score: ${result.score}/${result.totalQuestions || result.totalMarks} (${result.percentage || result.accuracy}%)`,
        type: result.passed ? 'success' : 'warning'
      });
      unregisterActiveTest(session.attemptId || attemptId);
      if (redirectOverride) {
        return true;
      }
      navigate(`/tests/review/${session.attemptId || attemptId}`, { state: { result }, replace: true });
      return true;
    } catch (err) {
      const errData = err.data?.data || err.data;
      const isExpired = errData?.status === 'expired' || err.message?.toLowerCase().includes('expired');
      const isConflict = err.status === 409;

      if (isExpired) {
        try {
          sessionStorage.removeItem(storageKey);
        } catch (_) { }
        addToast({
          title: 'Test Expired',
          message: 'The allowed test duration has elapsed. Navigating to your review...',
          type: 'warning'
        });
        unregisterActiveTest(session.attemptId || attemptId);
        if (redirectOverride) {
          return true;
        }
        navigate(`/tests/review/${session.attemptId || attemptId}`, {
          state: { result: errData || { status: 'expired', score: 0, result: 'Failed' } },
          replace: true
        });
        return true;
      }

      if (isConflict) {
        try {
          sessionStorage.removeItem(storageKey);
        } catch (_) { }
        addToast({
          title: 'Already Submitted',
          message: 'This test was previously submitted. Navigating to review...',
          type: 'info'
        });
        unregisterActiveTest(session.attemptId || attemptId);
        if (redirectOverride) {
          return true;
        }
        navigate(`/tests/review/${session.attemptId || attemptId}`, {
          state: { result: errData },
          replace: true
        });
        return true;
      }

      // For network or transient server errors, allow retry
      isSubmittedRef.current = false;
      addToast({
        title: 'Submission Failed',
        message: err.message || 'Please retry',
        type: 'error'
      });
      return false;
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  if (loading && !loadTimedOut) {
    return (
      <div className="py-24 text-center animate-pulse">
        <Clock className="w-12 h-12 text-teal-600 mx-auto mb-3 animate-spin" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Loading exam environment...
        </h3>
        <p className="text-xs text-slate-400 mt-2">Setting up questions and timer...</p>
      </div>
    );
  }

  if (loadTimedOut && loading) {
    return (
      <div className="py-24 text-center max-w-md mx-auto px-4 animate-in fade-in">
        <Clock className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
          Environment Initialization Delayed
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          The test environment is taking longer than usual to connect. You can retry loading or return to the mock tests overview.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Retry Loading
          </button>
          <button
            onClick={() => navigate('/tests')}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            Return to Mock Tests
          </button>
        </div>
      </div>
    );
  }

  if (!currentQ || questions.length === 0) {
    return (
      <div className="py-24 text-center max-w-md mx-auto px-4 animate-in fade-in">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
          Assessment Questions Unavailable
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          This mock test currently has no active questions configured or could not initialize its blueprint. Please return to your tests dashboard or notify your coordinator.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Retry Loading
          </button>
          <button
            onClick={() => navigate('/tests')}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            Return to Mock Tests
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter((a) => a.selectedOption).length;
  const markedCount = Object.values(answers).filter((a) => a.markedForReview).length;
  const isTimerCritical = remainingSeconds < 300; // less than 5 mins

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Test Top Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
              OFFICIAL MOCK ASSESSMENT
            </span>
            <Badge variant="teal">{session.company || 'ReadyUp'}</Badge>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {session.title}
          </h2>
          <span className="text-xs text-slate-400">
            Question {currentIndex + 1} of {questions.length} • Passing Cutoff: {session.passingMarks || 6} marks
          </span>
        </div>

        {/* Live Timer Pill */}
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xs font-bold transition-colors ${isTimerCritical
                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 animate-pulse border border-rose-300'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200'
              }`}
          >
            <Clock className={`w-4 h-4 ${isTimerCritical ? 'text-rose-600' : 'text-teal-600'}`} />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <span>Submit Test</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Examination View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Question Box (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 card-shadow min-h-[400px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-teal-600">
                    {currentQ.questionId}
                  </span>
                  <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-xs text-slate-500 font-medium">{currentQ.topic}</span>
                </div>
                <Badge variant={currentQ.difficulty}>{currentQ.difficulty}</Badge>
              </div>

              {/* Statement */}
              <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed mb-6 whitespace-pre-line">
                {currentQ.questionText}
              </p>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt) => {
                  const isSelected = currentAnswer.selectedOption === opt.optionId;
                  return (
                    <div
                      key={opt.optionId}
                      onClick={() => handleSelectOption(opt.optionId)}
                      className={`p-4 rounded-2xl border text-sm font-medium transition-all cursor-pointer flex items-center gap-3.5 ${isSelected
                          ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200'
                        }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${isSelected
                            ? 'bg-teal-600 text-white'
                            : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                          }`}
                      >
                        {opt.optionId}
                      </div>
                      <span className="flex-1">{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nav controls */}
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMarkReview}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${currentAnswer.markedForReview
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{currentAnswer.markedForReview ? 'Marked for Review' : 'Mark Review'}</span>
                </button>

                {currentAnswer.selectedOption && (
                  <button
                    type="button"
                    onClick={handleClearOption}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer px-2 py-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <span>Submit Test</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Palette */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 card-shadow">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Question Palette
            </h4>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const ans = answers[q.questionId];
                const isCurrent = idx === currentIndex;
                const isAnswered = ans && ans.selectedOption;
                const isMarked = ans && ans.markedForReview;

                let pillColor = 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300';
                if (isMarked) {
                  pillColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold';
                } else if (isAnswered) {
                  pillColor = 'bg-teal-600 text-white font-bold';
                }

                return (
                  <button
                    key={q.questionId}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl text-xs font-semibold transition-all cursor-pointer relative flex items-center justify-center ${pillColor} ${isCurrent ? 'ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-slate-900 scale-105' : ''
                      }`}
                  >
                    <span>{idx + 1}</span>
                    {isMarked && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Status counts */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  Answered:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Marked for Review:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{markedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  Unattempted:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {questions.length - answeredCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95">
            <ShieldAlert className="w-12 h-12 text-teal-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Confirm Final Submission
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              You have answered {answeredCount} out of {questions.length} questions. You cannot change your answers after submission.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Return to Test
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={performSubmit}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                {isSubmitting ? 'Evaluating...' : 'Yes, Submit Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Integrity - Test Paused Modal */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full p-6 sm:p-7 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-900/50">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Test Paused
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
              Your test has been paused because you left the active test window. Your answers, current question, and remaining time have been preserved.
            </p>

            <div className="bg-slate-50 dark:bg-slate-900/80 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-left">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Question Position</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {currentIndex + 1} of {questions.length}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Time Remaining</span>
                <span className="text-sm font-mono font-bold text-teal-600 dark:text-teal-400">
                  {formatTimer(remainingSeconds)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPaused(false)}
              className="w-full py-3 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Resume Test</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <p className="mt-3 text-[11px] text-slate-400">
              Please stay within this window until your test is submitted.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
