import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const ActiveTestContext = createContext(null);

export function useActiveTest() {
  const context = useContext(ActiveTestContext);
  if (!context) {
    throw new Error('useActiveTest must be used within an ActiveTestProvider');
  }
  return context;
}

export function ActiveTestProvider({ children }) {
  const [activeTest, setActiveTest] = useState(null);
  const [pendingDestination, setPendingDestination] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isSubmittingAndLeaving, setIsSubmittingAndLeaving] = useState(false);

  const navigate = useNavigate();
  const isSubmittingRef = useRef(false);

  const registerActiveTest = useCallback((testInfo) => {
    setActiveTest(testInfo);
  }, []);

  const unregisterActiveTest = useCallback((attemptId) => {
    setActiveTest((prev) => (prev?.attemptId === attemptId ? null : prev));
  }, []);

  const requestSidebarNavigation = useCallback((destination) => {
    if (!activeTest) {
      return true; // No active test; allow normal sidebar navigation
    }
    // Active test in progress: prevent immediate navigation and prompt user
    setPendingDestination(() => destination);
    setShowLeaveModal(true);
    return false;
  }, [activeTest]);

  const handleStayOnTest = useCallback(() => {
    if (isSubmittingRef.current || isSubmittingAndLeaving) return;
    setShowLeaveModal(false);
    setPendingDestination(null);
  }, [isSubmittingAndLeaving]);

  const handleSubmitAndLeave = useCallback(async () => {
    if (!activeTest || !activeTest.submitAndLeave || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmittingAndLeaving(true);

    try {
      const dest = pendingDestination;
      const success = await activeTest.submitAndLeave(dest);
      if (success) {
        setShowLeaveModal(false);
        setPendingDestination(null);
        setActiveTest(null);

        // Navigate to originally clicked destination only after successful submission
        if (typeof dest === 'function') {
          dest();
        } else if (typeof dest === 'string' && dest) {
          navigate(dest);
        }
      } else {
        // If submission failed, keep student on test page and close modal so answers remain visible
        setShowLeaveModal(false);
        setPendingDestination(null);
      }
    } catch (err) {
      // Submission error occurred. Keep user on test page with progress intact.
      setShowLeaveModal(false);
      setPendingDestination(null);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmittingAndLeaving(false);
    }
  }, [activeTest, pendingDestination, navigate]);

  return (
    <ActiveTestContext.Provider
      value={{
        activeTest,
        registerActiveTest,
        unregisterActiveTest,
        requestSidebarNavigation,
        showLeaveModal,
        isSubmittingAndLeaving
      }}
    >
      {children}

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full p-6 sm:p-7 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-900/50">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Active Test in Progress
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              You have an active test or quiz. You must submit the test before leaving this page. If you leave now, your current attempt may be interrupted.
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                disabled={isSubmittingAndLeaving}
                onClick={handleStayOnTest}
                className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                Stay on Test
              </button>
              <button
                type="button"
                disabled={isSubmittingAndLeaving}
                onClick={handleSubmitAndLeave}
                className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmittingAndLeaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    <span>Submitting & Leaving...</span>
                  </>
                ) : (
                  <span>Submit Test & Leave</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ActiveTestContext.Provider>
  );
}
