import { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Award,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { testService } from '../../services/testService';
import Badge from '../common/Badge';

export default function AttemptReviewModal({ attemptId, studentInfo, onClose }) {
  const [loading, setLoading] = useState(true);
  const [reviewData, setReviewData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'correct', 'incorrect', 'unanswered'

  useEffect(() => {
    let isMounted = true;
    async function fetchReview() {
      if (!attemptId) return;
      setLoading(true);
      setError('');
      try {
        const res = await testService.getAttemptReview(attemptId);
        if (isMounted) setReviewData(res);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load attempt review.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchReview();
    return () => {
      isMounted = false;
    };
  }, [attemptId]);

  if (!attemptId) return null;

  const questions = reviewData?.questions || [];
  const correctCount = questions.filter((q) => q.isCorrect).length;
  const answeredCount = questions.filter((q) => q.userAnswer && q.userAnswer.trim() !== '').length;
  const incorrectCount = answeredCount - correctCount;
  const unansweredCount = questions.length - answeredCount;

  const filteredQuestions = questions.filter((q) => {
    const isAnswered = q.userAnswer && q.userAnswer.trim() !== '';
    if (filter === 'correct') return q.isCorrect;
    if (filter === 'incorrect') return isAnswered && !q.isCorrect;
    if (filter === 'unanswered') return !isAnswered;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                ATTEMPT ANSWER REVIEW
              </span>
              {reviewData?.result && (
                <Badge variant={reviewData.result === 'Passed' ? 'Passed' : 'Needs Review'}>
                  {reviewData.result}
                </Badge>
              )}
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {reviewData?.title || 'Mock Test Attempt Review'}
            </h3>
            {studentInfo && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Candidate: <span className="font-semibold text-slate-800 dark:text-slate-200">{studentInfo.name || studentInfo.studentName}</span>
                {studentInfo.studentId && ` (${studentInfo.studentId})`} • {studentInfo.department || 'General'}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-400">Loading candidate attempt answers...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-400 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Scorecard Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50">
                  <div className="text-[11px] font-medium text-teal-700 dark:text-teal-400">Score & Accuracy</div>
                  <div className="text-xl font-extrabold text-teal-900 dark:text-teal-200 mt-0.5">
                    {reviewData?.score ?? 0} / {reviewData?.totalMarks ?? questions.length}
                    <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 ml-1.5">
                      ({reviewData?.accuracy ?? 0}%)
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                  <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Correct Answers</div>
                  <div className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-0.5">
                    {correctCount}
                    <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 ml-1">marks earned</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50">
                  <div className="text-[11px] font-medium text-rose-700 dark:text-rose-400">Incorrect Answers</div>
                  <div className="text-xl font-extrabold text-rose-900 dark:text-rose-200 mt-0.5">
                    {incorrectCount}
                    <span className="text-xs font-normal text-rose-600 dark:text-rose-400 ml-1">questions</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Unanswered</div>
                  <div className="text-xl font-extrabold text-slate-700 dark:text-slate-300 mt-0.5">
                    {unansweredCount}
                    <span className="text-xs font-normal text-slate-400 ml-1">skipped</span>
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                {[
                  { id: 'all', label: `All Questions (${questions.length})` },
                  { id: 'correct', label: `Correct (${correctCount})` },
                  { id: 'incorrect', label: `Incorrect (${incorrectCount})` },
                  { id: 'unanswered', label: `Unanswered (${unansweredCount})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      filter === tab.id
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No questions match the selected filter.
                  </div>
                ) : (
                  filteredQuestions.map((q, idx) => {
                    const isAnswered = Boolean(q.userAnswer && q.userAnswer.trim() !== '');
                    const isCorrect = Boolean(q.isCorrect);

                    return (
                      <div
                        key={q.questionId || idx}
                        className={`p-5 rounded-2xl border transition-all ${
                          !isAnswered
                            ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                            : isCorrect
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60'
                              : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-500">
                              Q{idx + 1}.
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                              {q.questionId}
                            </span>
                            {q.topic && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-medium">
                                {q.topic}
                              </span>
                            )}
                          </div>

                          <div>
                            {!isAnswered ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                                <HelpCircle className="w-3.5 h-3.5" /> Unanswered (0 pts)
                              </span>
                            ) : isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+1 pt)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                <XCircle className="w-3.5 h-3.5" /> Incorrect (0 pts)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Question Text */}
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-2 leading-relaxed">
                          {q.questionText}
                        </p>

                        {/* Options Grid */}
                        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || []).map((opt) => {
                            const isChosen = q.userAnswer && q.userAnswer.toUpperCase() === opt.optionId?.toUpperCase();
                            const isCorrectOpt = q.correctOption && q.correctOption.toUpperCase() === opt.optionId?.toUpperCase();

                            let optStyle = 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300';
                            if (isCorrectOpt) {
                              optStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold';
                            } else if (isChosen && !isCorrect) {
                              optStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-bold';
                            }

                            return (
                              <div
                                key={opt.optionId}
                                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${optStyle}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px]">
                                    {opt.optionId}
                                  </span>
                                  <span>{opt.text}</span>
                                </div>
                                <div>
                                  {isCorrectOpt && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                                      Correct
                                    </span>
                                  )}
                                  {isChosen && !isCorrectOpt && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-900/60 px-1.5 py-0.5 rounded">
                                      Student Selected
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/40">
                            <span className="font-bold text-slate-800 dark:text-slate-200">Explanation: </span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
}
