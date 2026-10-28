import { useEffect, useLayoutEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ActiveTestProvider, useActiveTest } from './context/ActiveTestContext';

import AppLayout from './components/common/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Student Pages
import StudentDashboard from './pages/StudentDashboard';
import PracticeTopicsPage from './pages/PracticeTopicsPage';
import PracticeSessionPage from './pages/PracticeSessionPage';
import CompanyDirectoryPage from './pages/CompanyDirectoryPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import MockTestsPage from './pages/MockTestsPage';
import ActiveMockTestPage from './pages/ActiveMockTestPage';
import TestResultPage from './pages/TestResultPage';
import RevisionCentrePage from './pages/RevisionCentrePage';
import StudentProfilePage from './pages/StudentProfilePage';

// Coordinator Pages
import CoordinatorDashboardPage from './pages/CoordinatorDashboardPage';
import CoordinatorMockTestsPage from './pages/CoordinatorMockTestsPage';
import CoordinatorStudentsPage from './pages/CoordinatorStudentsPage';
import CoordinatorAnalyticsPage from './pages/CoordinatorAnalyticsPage';
import CoordinatorReportsPage from './pages/CoordinatorReportsPage';
import CoordinatorImportPage from './pages/CoordinatorImportPage';
import CoordinatorQuestionsPage from './pages/CoordinatorQuestionsPage';
import CoordinatorHistoryPage from './pages/CoordinatorHistoryPage';

// Admin Pages
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { role, isAuthenticated, isLoggingOut } = useAuth();

  if (isLoggingOut) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If coordinator tries student dashboard or vice-versa, route to their natural dashboard
    if (role === 'coordinator') return <Navigate to="/coordinator/dashboard" replace />;
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Handler for browser Back navigation policy:
// When the user presses the browser Back button from an authenticated dashboard/page to a public route,
// end the current authenticated client session and redirect to the public Landing Page '/'
function AuthBackNavigationHandler() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const { isAuthenticated, logout, isLoggingOut } = useAuth();
  const { activeTest, requestSidebarNavigation } = useActiveTest();

  const prevPathRef = useRef(null);
  const wasAuthRef = useRef(false);

  useLayoutEffect(() => {
    const prevPath = prevPathRef.current;
    const currentPath = location.pathname;
    const wasAuth = wasAuthRef.current;

    // Keep refs updated for tracking transitions
    prevPathRef.current = currentPath;
    wasAuthRef.current = isAuthenticated;

    // Check if this was a POP navigation (browser Back / Forward)
    if (navigationType === 'POP' && prevPath !== null) {
      const publicPaths = ['/', '/landing', '/login', '/register', '/sso/callback'];
      const isPublicPath = (path) => !path || publicPaths.some((p) => path === p || (p !== '/' && path.startsWith(p)));

      const wasOnAuthenticatedPage = wasAuth && !isPublicPath(prevPath);
      const isNowOnPublicPage = isPublicPath(currentPath);

      // Back navigation from an authenticated dashboard/page to a public route
      if (wasOnAuthenticatedPage && isNowOnPublicPage && !isLoggingOut) {
        if (activeTest) {
          // If an active test is in progress, do NOT silently logout or abandon the test
          navigate(prevPath, { replace: true });
          requestSidebarNavigation(() => {
            logout();
          });
          return;
        }

        // Controlled logout: terminates client session and lands cleanly on '/'
        logout();
      }
    }
  }, [location.pathname, navigationType, isAuthenticated, isLoggingOut, logout, activeTest, requestSidebarNavigation, navigate]);

  return null;
}

// Public Root Route — renders Landing Page (with role-aware workspace CTA when authenticated)
function RootRedirect() {
  const { isLoggingOut, resetLoggingOut } = useAuth();

  useEffect(() => {
    if (isLoggingOut) {
      resetLoggingOut();
    }
  }, [isLoggingOut, resetLoggingOut]);

  return <LandingPage />;
}

// Modular SSO Redirect Callback Handler (Per Section 7 of API Contract)
function SSOCallbackHandler() {
  const { switchRoleDev } = useAuth();
  // Read params if present, e.g. ?ticket=... or ?role=...
  const params = new URLSearchParams(window.location.search);
  const externalRole = params.get('role') || 'student';
  switchRoleDev(externalRole);

  if (externalRole === 'coordinator') return <Navigate to="/coordinator/dashboard" replace />;
  if (externalRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <ActiveTestProvider>
              <AuthBackNavigationHandler />
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/sso/callback" element={<SSOCallbackHandler />} />

              {/* Authenticated Application Layout */}
              <Route element={<AppLayout />}>
                {/* Student Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/practice"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <PracticeTopicsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/practice/session/:attemptId"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <PracticeSessionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/companies"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <CompanyDirectoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/companies/:slug"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <CompanyDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tests"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <MockTestsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tests/take/:attemptId"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <ActiveMockTestPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tests/review/:attemptId"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <TestResultPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/revision"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <RevisionCentrePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                      <StudentProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* T&P Coordinator Routes */}
                <Route
                  path="/coordinator/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                      <CoordinatorDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coordinator/mock-tests"
                  element={
                    <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                      <CoordinatorMockTestsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coordinator/students"
                  element={
                    <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                      <CoordinatorStudentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coordinator/analytics"
                  element={
                    <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                      <CoordinatorAnalyticsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coordinator/reports"
                  element={
                    <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                      <CoordinatorReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coordinator/import"
                  element={
                    <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                      <CoordinatorImportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coordinator/questions"
                  element={
                    <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                      <CoordinatorQuestionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coordinator/history"
                  element={
                    <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                      <CoordinatorHistoryPage />
                    </ProtectedRoute>
                  }
                />

                {/* Administrator Routes */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminUsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit-logs"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminAuditLogsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ActiveTestProvider>
        </AuthProvider>
      </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
