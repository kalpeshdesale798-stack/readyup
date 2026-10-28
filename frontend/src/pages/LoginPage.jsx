import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, Navigate, useNavigationType } from 'react-router-dom';
import { Award, ArrowRight, Lock, Mail, AlertCircle, CheckCircle2, X, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/authService';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: request token, 2: reset password
  const [forgotRole, setForgotRole] = useState('student');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [smtpWarning, setSmtpWarning] = useState(null);

  const { login, role, isAuthenticated, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [searchParams] = useSearchParams();

  // If user arrived on /login via browser Back while authenticated, terminate the session cleanly
  useEffect(() => {
    if (navigationType === 'POP' && isAuthenticated && !isLoading) {
      logout();
    }
  }, [navigationType, isAuthenticated, isLoading, logout]);

  const tokenParam = searchParams.get('resetToken') || searchParams.get('token');

  // If URL has resetToken or token param, open reset password modal directly
  useEffect(() => {
    if (tokenParam) {
      setForgotToken(tokenParam);
      setForgotStep(2);
      setShowForgotModal(true);
    }
  }, [tokenParam]);

  // If user is already authenticated and not actively submitting login, redirect to role dashboard
  if (isAuthenticated && !tokenParam && !isLoading) {
    if (navigationType === 'POP') {
      // Arrived via Back navigation: do not bounce back to dashboard; allow logout to complete
      return null;
    }
    const targetPath = role === 'coordinator'
      ? '/coordinator/dashboard'
      : role === 'admin'
      ? '/admin/dashboard'
      : '/dashboard';
    return <Navigate to={targetPath} replace />;
  }

  const roleParam = searchParams.get('role');
  const activeRole = roleParam === 'coordinator' ? 'coordinator' : roleParam === 'admin' ? 'admin' : 'student';

  const roleConfig = {
    student: {
      badge: 'Student Portal',
      badgeClass: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/60',
      title: 'Student Login',
      subtitle: 'Placement Aptitude Preparation Portal',
    },
    coordinator: {
      badge: 'Coordinator Portal',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
      title: 'Coordinator Login',
      subtitle: 'Training & Placement Management Portal',
    },
    admin: {
      badge: 'Administrator Portal',
      badgeClass: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/60',
      title: 'Admin Login',
      subtitle: 'Platform Governance & Security Portal',
    }
  };

  const currentConfig = roleConfig[activeRole];

  const getRoleLandingPath = () => {
    if (!isAuthenticated) return '/';
    if (role === 'coordinator') return '/coordinator/dashboard';
    if (role === 'admin') return '/admin/dashboard';
    return '/dashboard';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(email, password, activeRole);
      addToast({
        title: `Welcome back, ${res.user.name}!`,
        message: 'Successfully logged in to ReadyUp.',
        type: 'success'
      });

      const targetPath = res.user.role === 'coordinator'
        ? '/coordinator/dashboard'
        : res.user.role === 'admin'
        ? '/admin/dashboard'
        : '/dashboard';
      navigate(targetPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    setForgotEmail(email);
    setForgotRole(activeRole);
    setForgotError('');
    setForgotSuccess('');
    setSmtpWarning(null);
    setForgotStep(1);
    setShowForgotModal(true);
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setSmtpWarning(null);

    if (!forgotEmail.trim()) {
      setForgotError('Please enter a valid email address');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authService.forgotPassword(forgotEmail.trim(), forgotRole);

      if (res.emailConfigured === false) {
        setSmtpWarning(
          'Email delivery service (SMTP) is not configured on this server. Reset instructions could not be delivered to an external inbox. Please contact your system administrator to configure SMTP or provision reset authorization.'
        );
        if (res.data?.resetToken) {
          // Token is held strictly in component memory for authorized dev testing
          // NEVER displayed in UI text, developer link, or persistent storage
          setForgotToken(res.data.resetToken);
        }
      } else {
        setForgotSuccess(
          res.message || 'If an account matches that email address, password reset instructions have been sent.'
        );
      }
    } catch (err) {
      setForgotError(err.message || 'Unable to request password reset. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handlePerformReset = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotToken || !forgotToken.trim()) {
      setForgotError('A valid password reset link or authorization token is required to set a new password.');
      return;
    }
    if (!forgotNewPassword) {
      setForgotError('New password is required');
      return;
    }
    if (forgotNewPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    setForgotLoading(true);
    try {
      await authService.resetPassword(forgotToken.trim(), forgotNewPassword);
      addToast({
        title: 'Password Reset Successful',
        message: 'Your password has been updated. You can now log in.',
        type: 'success'
      });
      setEmail(forgotEmail);
      setPassword('');
      setShowForgotModal(false);
      setForgotToken('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotStep(1);
      navigate('/login?role=' + (activeRole || 'student'), { replace: true });
    } catch (err) {
      setForgotError(err.message || 'Failed to reset password. The reset link may be invalid or expired.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to={getRoleLandingPath()} className="inline-flex items-center gap-2.5 mb-3 group" title="ReadyUp">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-bold shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Award className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl text-slate-950 dark:text-white tracking-tight">
            ReadyUp
          </span>
        </Link>
        <div className="flex justify-center mb-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${currentConfig.badgeClass}`}>
            {currentConfig.badge}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {currentConfig.title}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {currentConfig.subtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-800 py-8 px-6 sm:px-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{error}</p>
                {error.toLowerCase().includes('coordinator') && activeRole !== 'coordinator' && (
                  <Link to="/login?role=coordinator" className="inline-block mt-1 font-semibold underline text-rose-800 dark:text-rose-200 hover:opacity-80">
                    Switch to Coordinator Login portal →
                  </Link>
                )}
                {error.toLowerCase().includes('admin') && activeRole !== 'admin' && (
                  <Link to="/login?role=admin" className="inline-block mt-1 font-semibold underline text-rose-800 dark:text-rose-200 hover:opacity-80">
                    Switch to Admin Login portal →
                  </Link>
                )}
                {error.toLowerCase().includes('student') && activeRole !== 'student' && (
                  <Link to="/login?role=student" className="inline-block mt-1 font-semibold underline text-rose-800 dark:text-rose-200 hover:opacity-80">
                    Switch to Student Login portal →
                  </Link>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>{isLoading ? 'Signing in...' : `Sign In as ${activeRole === 'student' ? 'Student' : activeRole === 'coordinator' ? 'Coordinator' : 'Admin'}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center">
            {activeRole === 'student' ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Need a new student account?{' '}
                <Link to="/register" className="text-teal-600 dark:text-teal-400 font-bold hover:underline">
                  Create one now
                </Link>
              </p>
            ) : activeRole === 'coordinator' ? (
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <Link to="/login?role=admin" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 font-medium">
                  Switch to Admin Login →
                </Link>
                <Link to="/login?role=student" className="text-slate-500 dark:text-slate-400 hover:underline">
                  Student Portal
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <Link to="/login?role=coordinator" className="text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 font-medium">
                  Switch to Coordinator Login →
                </Link>
                <Link to="/login?role=student" className="text-slate-500 dark:text-slate-400 hover:underline">
                  Student Portal
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {forgotStep === 1 ? 'Password Recovery' : 'Set New Password'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {forgotStep === 1 ? 'Supported for Student, Coordinator & Admin accounts' : 'Create a secure new password for your account'}
                </p>
              </div>
            </div>

            {/* Step navigation tabs */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setForgotStep(1); setForgotError(''); }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${forgotStep === 1
                    ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
              >
                1. Request Reset Link
              </button>
              <button
                type="button"
                onClick={() => { setForgotStep(2); setForgotError(''); }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${forgotStep === 2
                    ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
              >
                2. Set New Password
              </button>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900/60 flex items-start gap-2 text-xs text-teal-800 dark:text-teal-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {smtpWarning && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  Configuration Notice:
                </p>
                <p className="leading-relaxed">{smtpWarning}</p>
                {forgotToken && (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setForgotStep(2); setForgotError(''); }}
                      className="py-1.5 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Continue to Set Password</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['student', 'coordinator', 'admin'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setForgotRole(r);
                          setForgotEmail(`${r}@readyup.edu`);
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border capitalize transition-all cursor-pointer ${forgotRole === r
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="account@readyup.edu"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>{forgotLoading ? 'Processing...' : 'Send Reset Link'}</span>
                  </button>
                </div>
              </form>
            ) : !forgotToken ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  <p className="font-semibold mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Reset Authorization Required
                  </p>
                  <p>
                    A valid password reset link or authorization token is required to set a new password. Please submit a reset request first or open the reset link received in your email.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setForgotStep(1); setForgotError(''); }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors cursor-pointer text-center"
                  >
                    ← Request Reset Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePerformReset} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password (min. 8 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setForgotStep(1); setForgotError(''); }}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>{forgotLoading ? 'Updating...' : 'Set Password'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
