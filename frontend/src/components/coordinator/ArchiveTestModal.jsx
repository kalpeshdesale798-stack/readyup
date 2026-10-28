import { useState } from 'react';
import { AlertTriangle, Trash2, X, Archive, ShieldCheck } from 'lucide-react';
import { coordinatorService } from '../../services/coordinatorService';
import { useToast } from '../../context/ToastContext';

export default function ArchiveTestModal({ isOpen, onClose, test, onTestArchived }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { addToast } = useToast();

  if (!isOpen || !test) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await coordinatorService.archiveMockTest(test._id);
      addToast({
        title: 'Mock Test Archived',
        message: `'${test.title}' was safely archived. Student records preserved.`,
        type: 'success',
      });
      if (onTestArchived) onTestArchived();
      onClose();
    } catch (err) {
      addToast({
        title: 'Error Archiving Test',
        message: err.message || 'Failed to archive mock test',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const attemptsCount = test.totalAttempts || test.completedAttempts || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 text-center animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-900/50">
          <Archive className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          Archive Mock Test?
        </h3>

        <div className="text-xs font-semibold text-slate-500 mb-4 px-2">
          {test.title}
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-left space-y-2 mb-6 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Strict Historical Data Protection:</span>
          </div>
          <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside text-[11px] leading-relaxed">
            <li>Immediately hidden from student mock-test listings.</li>
            <li>No new attempts can be started.</li>
            <li>
              <b>{attemptsCount} recorded student attempts</b>, answers, accuracy scores, and reports remain safely intact in MongoDB.
            </li>
            <li>Question bank questions will NOT be deleted.</li>
          </ul>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Archiving...</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span>Safely Archive</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
