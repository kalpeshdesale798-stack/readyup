import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Brain,
  Building2,
  Timer,
  BookmarkCheck,
  User,
  LogOut,
  ChevronRight,
  BookOpen,
  FileSpreadsheet,
  History,
  Users,
  ShieldCheck,
  Sparkles,
  Award,
  BarChart3,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActiveTest } from '../../context/ActiveTestContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user, role, logout } = useAuth();
  const { addToast } = useToast();
  const { requestSidebarNavigation } = useActiveTest();
  const navigate = useNavigate();

  const getRoleLandingPath = () => {
    const effectiveRole = user?.role || role;
    if (effectiveRole === 'coordinator') return '/coordinator/dashboard';
    if (effectiveRole === 'admin') return '/admin/dashboard';
    return '/dashboard';
  };

  const handleLogout = async () => {
    await logout();
    addToast({ title: 'Signed out', message: 'You have been logged out successfully.', type: 'info' });
  };

  const handleNavClick = (e, destination) => {
    const canNavigate = requestSidebarNavigation(destination);
    if (!canNavigate) {
      e.preventDefault();
      onClose?.();
      return;
    }
    onClose?.();
  };

  const handleLogoutClick = (e) => {
    const canNavigate = requestSidebarNavigation(() => handleLogout());
    if (!canNavigate) {
      e.preventDefault();
      onClose?.();
      return;
    }
    handleLogout();
  };

  // Nav configurations based on exact 3 roles: Student, Coordinator, Admin
  const navItems = {
    student: [
      { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Topic Practice', path: '/practice', icon: Brain },
      { name: 'Company Drills', path: '/companies', icon: Building2 },
      { name: 'Mock Tests', path: '/tests', icon: Timer },
      { name: 'Revision Centre', path: '/revision', icon: BookmarkCheck },
      { name: 'My Profile', path: '/profile', icon: User }
    ],
    coordinator: [
      { name: 'Overview', path: '/coordinator/dashboard', icon: LayoutDashboard },
      { name: 'Mock Tests', path: '/coordinator/mock-tests', icon: Timer },
      { name: 'Students', path: '/coordinator/students', icon: Users },
      { name: 'Analytics', path: '/coordinator/analytics', icon: BarChart3 },
      { name: 'Reports', path: '/coordinator/reports', icon: FileText },
      { name: 'Question Bank', path: '/coordinator/questions', icon: BookOpen },
      { name: 'Spreadsheet Import', path: '/coordinator/import', icon: FileSpreadsheet },
      { name: 'Import History', path: '/coordinator/history', icon: History }
    ],
    admin: [
      { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'User Management', path: '/admin/users', icon: Users },
      { name: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldCheck }
    ]
  }[role || 'student'] || [];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <Link
            to={getRoleLandingPath()}
            onClick={(e) => handleNavClick(e, getRoleLandingPath())}
            className="p-6 flex items-center gap-3 group focus:outline-hidden focus:ring-2 focus:ring-teal-500 rounded-2xl transition-all cursor-pointer"
            title="Return to Dashboard"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white tracking-tight leading-none text-base group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                ReadyUp
              </div>
              <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
                {role === 'coordinator' ? 'Coordinator Cell' : role === 'admin' ? 'Admin Portal' : 'Student Aptitude'}
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="px-3 py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={(e) => handleNavClick(e, item.path)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive
                              ? 'text-teal-600 dark:text-teal-400'
                              : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                          }`}
                        />
                        <span>{item.name}</span>
                      </div>
                      {isActive && (
                        <ChevronRight className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="mb-4 px-2">
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
              Stay on top of your practice drills and mock exam sessions.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'RU'}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">
                  {role}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogoutClick}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
