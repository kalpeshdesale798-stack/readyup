import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award,
  ArrowRight,
  Brain,
  Building2,
  Timer,
  CheckCircle2,
  Sparkles,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const [navAdminOpen, setNavAdminOpen] = useState(false);
  const [heroAdminOpen, setHeroAdminOpen] = useState(false);
  const navAdminRef = useRef(null);
  const heroAdminRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navAdminRef.current && !navAdminRef.current.contains(e.target)) {
        setNavAdminOpen(false);
      }
      if (heroAdminRef.current && !heroAdminRef.current.contains(e.target)) {
        setHeroAdminOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNavAdminOpen(false);
        setHeroAdminOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleEnterApp = () => {
    if (!isAuthenticated) {
      navigate('/login?role=student');
    } else if (role === 'coordinator') {
      navigate('/coordinator/dashboard');
    } else if (role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const getRoleLandingPath = () => {
    if (!isAuthenticated) return '/';
    if (role === 'coordinator') return '/coordinator/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to={getRoleLandingPath()}
            className="flex items-center gap-3 group focus:outline-hidden focus:ring-2 focus:ring-teal-500 rounded-xl"
            title="ReadyUp"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold shadow-sm shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                ReadyUp
              </span>
              <span className="text-[10px] text-teal-600 font-bold ml-1.5 px-1.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800">
                Aptitude
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login?role=student"
              className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>

            {/* Admin Selector Menu */}
            <div className="relative" ref={navAdminRef}>
              <button
                type="button"
                onClick={() => setNavAdminOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 px-3 py-1.5 transition-colors cursor-pointer"
                aria-expanded={navAdminOpen}
                aria-haspopup="true"
              >
                <span>Admin</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${navAdminOpen ? 'rotate-180' : ''}`} />
              </button>

              {navAdminOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 text-left">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Institutional Portals
                  </div>
                  <Link
                    to="/login?role=coordinator"
                    onClick={() => setNavAdminOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold">Coordinator Login</div>
                      <div className="text-[10px] text-slate-400 font-normal">T&P Question Management</div>
                    </div>
                  </Link>
                  <Link
                    to="/login?role=admin"
                    onClick={() => setNavAdminOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <div className="font-bold">Admin Login</div>
                      <div className="text-[10px] text-slate-400 font-normal">Governance & Audit Ledger</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <button
              onClick={handleEnterApp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all duration-200 cursor-pointer"
            >
              <span>{isAuthenticated ? 'Open Dashboard' : 'Get Started'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-teal-800 dark:text-teal-300 text-xs font-semibold mb-6 animate-in fade-in">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>Campus Placement Aptitude Preparation Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-[1.15] mb-6">
          Master Aptitude Tests for{' '}
          <span className="text-teal-600 dark:text-teal-400">Campus Placements</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Prepare for Tier-1 engineering placements with curated topic drills, verified company test patterns, timed full-length mocks, and real-time weakness analytics.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleEnterApp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-600/20 transition-all cursor-pointer active:scale-95"
          >
            <span>{isAuthenticated ? 'Open Student Workspace' : 'Student Login'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Hero Admin Selector Menu */}
          <div className="relative w-full sm:w-auto" ref={heroAdminRef}>
            <button
              type="button"
              onClick={() => setHeroAdminOpen((prev) => !prev)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-sm shadow-xs transition-all cursor-pointer"
              aria-expanded={heroAdminOpen}
              aria-haspopup="true"
            >
              <span>Admin</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${heroAdminOpen ? 'rotate-180' : ''}`} />
            </button>

            {heroAdminOpen && (
              <div className="absolute left-1/2 sm:left-0 -translate-x-1/2 sm:translate-x-0 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl py-2 z-50 text-left animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Institutional Portals
                </div>
                <Link
                  to="/login?role=coordinator"
                  onClick={() => setHeroAdminOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <div className="font-bold">Coordinator Login</div>
                    <div className="text-[10px] text-slate-400 font-normal">T&P Question Management</div>
                  </div>
                </Link>
                <Link
                  to="/login?role=admin"
                  onClick={() => setHeroAdminOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                  <div>
                    <div className="font-bold">Admin Login</div>
                    <div className="text-[10px] text-slate-400 font-normal">Governance & Audit Ledger</div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-12 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow">
            <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-4">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Topic-Wise Drills
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Targeted practice across Quantitative Aptitude, Logical Reasoning, Verbal Ability, and Data Interpretation with difficulty levels.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow">
            <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Company Test Patterns
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Verified test structures for TCS NQT, Infosys, Accenture, Cognizant, Capgemini, and Wipro with sectional time limits.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow">
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-4">
              <Timer className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Timed Mocks & Analytics
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Exam-grade timed test interface with automatic scoring, detailed explanations, and performance recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* Role Architecture Overview */}
      <section className="py-12 px-4 sm:px-6 max-w-6xl mx-auto border-t border-slate-200/60 dark:border-slate-800">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Designed for Engineering Institutions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Three dedicated roles tailored for placement preparation workflows
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Role 1</span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">Student</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Solve topic drills, take company mock tests, review mistakes, and bookmark difficult questions.
              </p>
            </div>
            <Link
              to="/login?role=student"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 mt-4 group"
            >
              <span>Student Login</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Role 2</span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">T&P Coordinator</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Bulk-upload verified aptitude spreadsheets (.xlsx/.csv), preview parsed rows, and manage active question banks.
              </p>
            </div>
            <Link
              to="/login?role=coordinator"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 mt-4 group"
            >
              <span>Coordinator Login</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">Role 3</span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">Administrator</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Provision accounts, assign coordinator roles, review campus audit logs, and monitor overall pass rates.
              </p>
            </div>
            <Link
              to="/login?role=admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 mt-4 group"
            >
              <span>Admin Login</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-400">
        <p>&copy; 2026 ReadyUp Aptitude Platform. Built for engineering placement readiness.</p>
      </footer>
    </div>
  );
}
