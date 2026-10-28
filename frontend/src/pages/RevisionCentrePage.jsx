import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookmarkCheck,
  AlertCircle,
  AlertTriangle,
  Trash2,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  StickyNote,
  X
} from 'lucide-react';
import { bookmarkService } from '../services/bookmarkService';
import { testService } from '../services/testService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

export default function RevisionCentrePage() {
  const [activeTab, setActiveTab] = useState('bookmarks'); // 'bookmarks' | 'incorrect'
  const [bookmarks, setBookmarks] = useState([]);
  const [incorrectQuestions, setIncorrectQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [isStartingDrill, setIsStartingDrill] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    async function loadRevisionData() {
      try {
        const [bmks, incorr] = await Promise.all([
          bookmarkService.getBookmarks(),
          testService.getIncorrectQuestions()
        ]);
        setBookmarks(bmks || []);
        setIncorrectQuestions(incorr || []);
      } catch (err) {
        console.error('Failed to load revision data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRevisionData();
  }, []);

  const [deletingIncorrectId, setDeletingIncorrectId] = useState(null);

  const handleDeleteBookmark = async (id) => {
    try {
      await bookmarkService.removeBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.questionId !== id && b._id !== id && b.bookmarkId !== id));
      addToast({
        title: 'Bookmark Removed',
        message: 'Question removed from your revision list',
        type: 'info'
      });
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleDeleteIncorrect = async (id) => {
    setDeletingIncorrectId(id);
    try {
      await testService.removeIncorrectQuestion(id);
      setIncorrectQuestions((prev) =>
        prev.filter((q) => q.questionId !== id && q._id !== id)
      );
      addToast({
        title: 'Removed from Revision',
        message: 'Question removed from your revision history',
        type: 'info'
      });
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setDeletingIncorrectId(null);
    }
  };

  // Derive unique eligible questions across bookmarks and incorrect questions
  const getEligibleQuestionIds = () => {
    const idSet = new Set();
    const uniqueIds = [];

    const addId = (id) => {
      if (!id) return;
      const str = String(id).trim();
      const upper = str.toUpperCase();
      if (!idSet.has(upper)) {
        idSet.add(upper);
        uniqueIds.push(str);
      }
    };

    bookmarks.forEach((b) => {
      addId(b.questionId || b.question?.questionId || b.question?._id || b._id);
    });
    incorrectQuestions.forEach((q) => {
      addId(q.questionId || q._id);
    });

    return uniqueIds;
  };

  const handleLaunchRetryDrill = async () => {
    const eligibleIds = getEligibleQuestionIds();
    if (eligibleIds.length === 0) {
      addToast({
        title: 'No Questions for Revision',
        message: 'You currently have no bookmarked or previously incorrect questions to practice.',
        type: 'info'
      });
      return;
    }

    setIsStartingDrill(true);
    try {
      const session = await testService.startRevisionDrill(eligibleIds);
      addToast({
        title: 'Revision Drill Initialized',
        message: `Practicing ${session.questions?.length || eligibleIds.length} targeted revision questions`,
        type: 'success'
      });
      navigate(`/practice/session/${session.attemptId}`, { state: { session } });
    } catch (err) {
      addToast({ title: 'Error', message: err.message || 'Failed to initialize revision drill', type: 'error' });
    } finally {
      setIsStartingDrill(false);
    }
  };

  const handleConfirmClearAll = async () => {
    setIsClearing(true);
    try {
      await testService.clearAllRevisionItems();
      setBookmarks([]);
      setIncorrectQuestions([]);
      setShowClearConfirm(false);
      addToast({
        title: 'Revision Centre Cleared',
        message: 'All current revision items have been removed from your active revision list.',
        type: 'success'
      });
    } catch (err) {
      addToast({
        title: 'Error Clearing Revision',
        message: err.message || 'Failed to clear revision list. Please retry.',
        type: 'error'
      });
    } finally {
      setIsClearing(false);
    }
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400">
            PERSONALIZED LEARNING REPOSITORY
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Revision Centre
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Revisit bookmarked problems, personal notes, and past test mistakes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={bookmarks.length === 0 && incorrectQuestions.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold text-xs sm:text-sm hover:bg-rose-100 dark:hover:bg-rose-900/60 disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
            title="Clear all active revision items"
          >
            <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Clear All</span>
          </button>

          <button
            onClick={handleLaunchRetryDrill}
            disabled={isStartingDrill || (bookmarks.length === 0 && incorrectQuestions.length === 0)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <RotateCcw className={`w-4 h-4 ${isStartingDrill ? 'animate-spin' : ''}`} />
            <span>{isStartingDrill ? 'Preparing Drill...' : 'Launch Revision Drill'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex items-center gap-2 pb-2 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'bookmarks'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <BookmarkCheck className="w-4 h-4" />
          <span>Bookmarked Questions ({bookmarks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('incorrect')}
          className={`flex items-center gap-2 pb-2 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'incorrect'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Previously Incorrect ({incorrectQuestions.length})</span>
        </button>
      </div>

      {/* Tab 1: Bookmarks */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-4">
          {bookmarks.map((bmk) => {
            const q = bmk.question || bmk;
            const qId = bmk.questionId || q.questionId;
            const note = bmk.note || bmk.notes;
            const isExp = expanded[bmk._id];
            return (
              <div
                key={bmk._id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 card-shadow space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-teal-600">
                      {qId}
                    </span>
                    <Badge variant={q.difficulty || 'medium'}>{q.difficulty || 'medium'}</Badge>
                    <span className="text-xs text-slate-400 capitalize hidden sm:inline">
                      {q.topic || 'Quantitative'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpand(bmk._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExp ? 'Hide Details' : 'View Question'}</span>
                      {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteBookmark(qId || bmk._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Remove Bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Personal Note */}
                {note && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                    <StickyNote className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Your Revision Memo: </span>
                      {note}
                    </div>
                  </div>
                )}

                {/* Question Statement */}
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                  {q.questionText || bmk.questionText || 'Practice question statement'}
                </p>

                {/* Expanded Details */}
                {isExp && q.options && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt) => (
                        <div
                          key={opt.optionId}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                            opt.optionId === q.correctOption
                              ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-semibold'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-bold">{opt.optionId}.</span>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                          Explanation:
                        </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {bookmarks.length === 0 && (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
              <BookmarkCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No bookmarked questions yet
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                While reviewing test results or solving drills, click &ldquo;Bookmark&rdquo; to save challenging questions here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Incorrect Questions */}
      {activeTab === 'incorrect' && (
        <div className="space-y-4">
          {incorrectQuestions.map((q) => (
            <div
              key={q._id}
              className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 card-shadow space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-rose-600">
                    {q.questionId}
                  </span>
                  <Badge variant="rose">Missed in Past Test</Badge>
                  <span className="text-xs text-slate-400">{q.topic}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={q.difficulty}>{q.difficulty}</Badge>
                  <button
                    onClick={() => handleDeleteIncorrect(q.questionId || q._id)}
                    disabled={deletingIncorrectId === (q.questionId || q._id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-40"
                    title="Remove from Revision"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                {q.questionText}
              </p>

              {q.explanation && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                    Correct Solution:
                  </span>
                  {q.explanation}
                </div>
              )}
            </div>
          ))}

          {incorrectQuestions.length === 0 && (
            <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Great job! No unresolved incorrect questions.
              </h4>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog: Clear All Revision Items */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 border border-slate-100 dark:border-slate-700 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Clear Revision Centre?
                  </h3>
                  <span className="text-xs text-slate-400">
                    Active revision list reset
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              This will remove all current bookmarked questions and previously missed questions from your active revision list. Original question-bank records and historical test attempts will not be affected.
            </p>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs">
              <p className="font-semibold">Note:</p>
              <p className="mt-0.5">
                Questions answered incorrectly in future tests or marked for review will automatically become eligible for revision again.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                disabled={isClearing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isClearing ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
