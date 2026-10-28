import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bookmark,
  Sparkles,
  ChevronLeft,
  X
} from 'lucide-react';
import { testService } from '../services/testService';
import { bookmarkService } from '../services/bookmarkService';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

/**
 * Normalise a result object that may come from either:
 *  a) submitAttempt response → has correctCount, wrongCount, unansweredCount, score, totalMarks, accuracy
 *  b) getAttemptReview response → has questions[], score, totalMarks, accuracy, result
 *
 * Returns a unified shape used by the render tree.
 */
function normalizeResult(raw) {
  if (!raw) return null;

  const questions = raw.questions || [];

  // Build detailedAnswers from the stored question snapshots (review endpoint)
  const detailedAnswers = questions.length > 0
    ? questions.map((q) => ({
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options || [],
        correctOption: q.correctOption,
        selectedOption: q.userAnswer || null,
        isCorrect: Boolean(q.isCorrect),
        explanation: q.explanation || '',
        topic: q.topic || 'General'
      }))
    : (raw.detailedAnswers || []);

  // Compute topic breakdown from detailed answers when available
  const topicBreakdown = raw.topicBreakdown
    ? raw.topicBreakdown
    : (() => {
        if (detailedAnswers.length === 0) return [];
        const topicMap = {};
        for (const q of detailedAnswers) {
          const t = q.topic || 'General';
          if (!topicMap[t]) topicMap[t] = { topic: t, correct: 0, total: 0 };
          topicMap[t].total += 1;
          if (q.isCorrect) topicMap[t].correct += 1;
        }
        return Object.values(topicMap).map((t) => ({
          ...t,
          accuracy: Math.round((t.correct / t.total) * 100)
        }));
      })();

  const answered = detailedAnswers.filter((q) => q.selectedOption).length;
  const correct = detailedAnswers.filter((q) => q.isCorrect).length;
  const incorrect = detailedAnswers.filter((q) => q.selectedOption && !q.isCorrect).length;
  const unanswered = detailedAnswers.length - answered;

  const score = raw.score ?? correct;
  const totalMarks = raw.totalMarks ?? raw.totalQuestions ?? detailedAnswers.length;
  const accuracy = raw.accuracy ?? (totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0);
  const passed = raw.result === 'Passed' || raw.passed === true || accuracy >= 60;

  // Build simple rule-based recommendations from topic breakdown
  const recommendations = raw.recommendations
    ? raw.recommendations
    : topicBreakdown.map((t) => ({
        topic: t.topic,
        status: t.accuracy >= 75 ? 'strong' : 'improve',
        message: t.accuracy >= 75
          ? `Great work! Your ${t.topic} accuracy is ${t.accuracy}%. Keep it up.`
          : `Focus on ${t.topic} — your accuracy is ${t.accuracy}%. Practice targeted drills to improve.`
      }));

  return {
    ...raw,
    score,
    totalMarks,
    totalQuestions: totalMarks,
    accuracy,
    passed,
    correctCount: raw.correctCount ?? correct,
    incorrectCount: raw.incorrectCount ?? incorrect,
    attemptedCount: raw.attemptedCount ?? answered,
    unansweredCount: raw.unansweredCount ?? unanswered,
    detailedAnswers,
    topicBreakdown,
    recommendations
  };
}

export default function TestResultPage() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkModal, setBookmarkModal] = useState({ open: false, questionId: '', note: '' });

  useEffect(() => {
    async function loadReview() {
      const stateResult = location.state?.result;

      // If we already have rich data (full review), just normalise
      if (stateResult && (stateResult.detailedAnswers?.length > 0 || stateResult.questions?.length > 0)) {
        setResult(normalizeResult(stateResult));
        setLoading(false);
        return;
      }

      // Always fetch full review (covers direct URL access and partial submit state)
      try {
        const id = attemptId || stateResult?.attemptId;
        if (!id) {
          navigate('/tests');
          return;
        }
        const res = await testService.getAttemptReview(id);
        // Merge submit-level fields from state with the richer review data
        const merged = stateResult ? { ...stateResult, ...res } : res;
        setResult(normalizeResult(merged));
      } catch (err) {
        console.error('Failed to load review:', err);
        if (stateResult) {
          setResult(normalizeResult(stateResult));
        } else {
          addToast({ title: 'Error', message: 'Could not load test results.', type: 'error' });
          navigate('/tests');
        }
      } finally {
        setLoading(false);
      }
    }
    loadReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const handleOpenBookmark = (questionId) => {
    setBookmarkModal({ open: true, questionId, note: '' });
  };

  const handleSaveBookmark = async (e) => {
    e.preventDefault();
    try {
      await bookmarkService.addBookmark(bookmarkModal.questionId, bookmarkModal.note);
      addToast({
        title: 'Saved to Revision Centre',
        message: 'Question bookmarked with your personal note.',
        type: 'success'
      });
      setBookmarkModal({ open: false, questionId: '', note: '' });
    } catch (err) {
      addToast({ title: 'Could not bookmark', message: err.message, type: 'error' });
    }
  };

  if (loading || !result) {
    return (
      <div className="py-24 text-center animate-pulse">
        <Award className="w-12 h-12 text-teal-600 mx-auto mb-3 animate-bounce" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Calculating test evaluation &amp; topic breakdown...
        </h3>
      </div>
    );
  }

  const detailed = result.detailedAnswers || [];
  const topicBreakdown = result.topicBreakdown || [];
  const recommendations = result.recommendations || [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/tests')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold shadow-xs hover:border-teal-500/50 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Back to Mock Tests</span>
        </button>
      </div>

      {/* Top Banner: Score & Pass/Fail */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 card-shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                ASSESSMENT RESULTS
              </span>
              <Badge variant={result.status === 'expired' ? 'danger' : (result.passed ? 'Passed' : 'Needs Review')}>
                {result.status === 'expired' ? 'Attempt Expired' : (result.passed ? 'Cutoff Cleared' : 'Needs Reinforcement')}
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {result.title}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Attempt ID: <span className="font-mono">{result.attemptId}</span> • Evaluated on{' '}
              {new Date(result.submittedAt || result.createdAt || Date.now()).toLocaleDateString()}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900/60 text-center min-w-[120px]">
            <span className="text-3xl font-extrabold text-teal-700 dark:text-teal-400">
              {result.score}/{result.totalMarks || result.totalQuestions || 0}
            </span>
            <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {result.accuracy ?? 0}% Accuracy
            </span>
          </div>
        </div>

        {/* 4 Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/60">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center">
            <span className="text-[11px] text-slate-400 block font-medium">Attempted</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {result.attemptedCount} / {result.totalQuestions}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 text-center">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-medium">Correct</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{result.correctCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 text-center">
            <span className="text-[11px] text-rose-700 dark:text-rose-400 block font-medium">Incorrect</span>
            <span className="text-lg font-bold text-rose-700 dark:text-rose-300">{result.incorrectCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center">
            <span className="text-[11px] text-slate-400 block font-medium">Unanswered</span>
            <span className="text-lg font-bold text-slate-700 dark:text-slate-300">{result.unansweredCount}</span>
          </div>
        </div>
      </div>

      {/* Topic Performance + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Sectional &amp; Topic Performance
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Accuracy breakdown by aptitude syllabus domain
          </p>
          {topicBreakdown.length > 0 ? (
            <div className="space-y-3">
              {topicBreakdown.map((t) => (
                <div key={t.topic} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{t.topic}</span>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      {t.accuracy}% ({t.correct}/{t.total})
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        t.accuracy >= 75 ? 'bg-emerald-500' : t.accuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.max(5, t.accuracy)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Topic breakdown not available for this attempt.</p>
          )}
        </div>

        <div className="lg:col-span-1 bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Next Steps</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Rule-based recommendations for your next practice</p>
            <div className="space-y-3">
              {recommendations.length > 0 ? recommendations.map((rec, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl text-xs leading-relaxed border ${
                    rec.status === 'strong'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <span className="font-bold block mb-0.5">{rec.topic}:</span>
                  {rec.message}
                </div>
              )) : (
                <p className="text-xs text-slate-400 italic">Complete a practice drill to get personalised recommendations.</p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/practice')}
            className="w-full mt-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer text-center"
          >
            Launch Target Topic Drill →
          </button>
        </div>
      </div>

      {/* Detailed Question Review */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Question-by-Question Solutions &amp; Explanations
          </h3>
          <span className="text-xs text-slate-400">{detailed.length} questions reviewed</span>
        </div>

        {detailed.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 card-shadow text-center">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Detailed review is not available for this attempt.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {detailed.map((item, idx) => (
              <div
                key={item.questionId}
                className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 card-shadow space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-teal-600">{item.questionId}</span>
                    <Badge variant={item.isCorrect ? 'Passed' : item.selectedOption ? 'Changes Requested' : 'neutral'}>
                      {item.isCorrect ? 'Correct' : item.selectedOption ? 'Incorrect' : 'Unanswered'}
                    </Badge>
                  </div>
                  <button
                    onClick={() => handleOpenBookmark(item.questionId)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1"
                    title="Bookmark for Revision"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Bookmark</span>
                  </button>
                </div>

                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed whitespace-pre-line">
                  {item.questionText}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {item.options.map((opt) => {
                    const isCorrect = opt.optionId === item.correctOption;
                    const isSelected = opt.optionId === item.selectedOption;
                    let optStyle = 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300';
                    if (isCorrect) {
                      optStyle = 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      optStyle = 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                    }
                    return (
                      <div key={opt.optionId} className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${optStyle}`}>
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 border flex items-center justify-center font-bold text-[11px]">
                            {opt.optionId}
                          </span>
                          <span>{opt.text}</span>
                        </div>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {item.explanation && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Step-by-Step Solution:</span>
                    {item.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Assessment Review Complete
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Your results, detailed answers, and score have been saved to your student profile.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/tests')}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Mock Tests</span>
        </button>
      </div>

      {/* Bookmark Modal */}
      {bookmarkModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-bold text-teal-600 uppercase">Add to Revision Centre</span>
              <button
                onClick={() => setBookmarkModal({ open: false, questionId: '', note: '' })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBookmark} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Question ID</label>
                <input
                  type="text"
                  value={bookmarkModal.questionId}
                  readOnly
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Personal Revision Note (Optional)</label>
                <textarea
                  rows="3"
                  value={bookmarkModal.note}
                  onChange={(e) => setBookmarkModal({ ...bookmarkModal, note: e.target.value })}
                  placeholder="e.g. Remember to convert hours to 1-day fractions before solving..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-hidden focus:border-teal-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBookmarkModal({ open: false, questionId: '', note: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
                  Save Bookmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
