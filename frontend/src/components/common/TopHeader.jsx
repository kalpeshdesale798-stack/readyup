import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Moon,
  Sun,
  Search,
  Bell,
  Check,
  Shield,
  Briefcase,
  GraduationCap
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { notificationService } from '../../services/notificationService';

export default function TopHeader({ onMenuClick, onSearchClick }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, role, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);

  // Close notifications on tab/route changes
  useEffect(() => {
    setShowNotifications(false);
  }, [location.pathname, location.search]);

  // Close notifications on outside click or Escape key
  useEffect(() => {
    if (!showNotifications) return;

    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications]);

  const getRoleLandingPath = () => {
    if (!isAuthenticated) return '/';
    const effectiveRole = user?.role || role;
    if (effectiveRole === 'coordinator') return '/coordinator/dashboard';
    if (effectiveRole === 'admin') return '/admin/dashboard';
    return '/dashboard';
  };

  // Generate page title from pathname
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path.includes('/coordinator/dashboard') || path.includes('/admin/dashboard') || path === '/dashboard') return 'Overview';
    if (path.includes('/coordinator/reports')) return 'Reports';
    if (path.includes('/coordinator/analytics')) return 'Analytics';
    if (path.includes('/coordinator/students')) return 'Students';
    if (path.includes('/coordinator/mock-tests')) return 'Mock Tests';
    if (path.includes('/coordinator/import')) return 'Spreadsheet Import';
    if (path.includes('/coordinator/questions')) return 'Question Bank';
    if (path.includes('/coordinator/history')) return 'Import History';
    if (path.includes('/admin/users')) return 'User Management';
    if (path.includes('/admin/audit-logs')) return 'Audit Logs';
    if (path.includes('/practice')) return 'Topic Practice';
    if (path.includes('/companies')) return 'Company Directory';
    if (path.includes('/tests/take')) return 'Assessment Session';
    if (path.includes('/tests/review')) return 'Attempt Review & Solutions';
    if (path.includes('/tests')) return 'Mock Tests';
    if (path.includes('/revision')) return 'Revision Centre';
    if (path.includes('/profile')) return 'Profile & Settings';
    if (path.includes('/dashboard')) return 'Overview';
    return 'Overview';
  };

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificationService.getNotifications();
      if (data) {
        setNotifications(data.notifications || []);
        setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
      }
    } catch {
      // Offline or network error handled gracefully without interrupting user
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();

    const handleFocus = () => fetchNotifications();
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(fetchNotifications, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      addToast({
        title: 'Notifications Updated',
        message: 'All notifications marked as read',
        type: 'info'
      });
    } catch {
      // Graceful error
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationService.markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Silently continue navigation
      }
    }
    if (notif.link) {
      setShowNotifications(false);
      navigate(notif.link);
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors">
      <div className="flex items-center justify-between px-4 sm:px-8 py-3.5">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white inline-block">
              {getBreadcrumb()}
            </h1>
          </div>
        </div>

        {/* Right Tools matching screenshot */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:rotate-12 active:scale-95 cursor-pointer"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Global Search Bar with Ctrl+K */}
          <button
            onClick={onSearchClick}
            className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search topics, companies, tests...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-500">
              ⌘K
            </kbd>
          </button>

          {/* Real-time Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className="p-2 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Notifications {unreadCount > 0 && `(${unreadCount})`}
                  </h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="space-y-2.5 pt-3 max-h-72 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-2.5 rounded-xl text-xs transition-colors cursor-pointer border ${
                          notif.isRead
                            ? 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                            : 'bg-teal-50/60 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900/60 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold">{notif.title}</p>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] mt-0.5 leading-relaxed">{notif.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Verified Role Badge (Enforced from backend session, no client role switching) */}
          <div className="px-2.5 py-1 text-xs font-medium rounded-full border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            <span className="capitalize font-semibold">{user?.role || role || 'student'}</span>
          </div>

          {/* User Profile Avatar Pill matching screenshot (Teal circle with initials + Name + Role) */}
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 pl-1.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-teal-100 dark:ring-teal-900 group-hover:ring-teal-400 transition-all">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'RU'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight group-hover:text-teal-600 transition-colors">
                {user?.name || 'User'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 capitalize leading-tight">
                {role === 'coordinator' ? 'Coordinator' : role === 'admin' ? 'Admin' : 'Student'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
