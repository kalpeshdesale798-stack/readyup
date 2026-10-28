import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  Activity,
  TrendingUp,
  Users,
  ShieldAlert,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { adminService } from '../services/adminService';
import MetricCard from '../components/common/MetricCard';
import Badge from '../components/common/Badge';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadAdminDashboard() {
      try {
        const res = await adminService.getDashboard();
        setData(res);
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const rawMetrics = data?.metrics;
  const metrics = Array.isArray(rawMetrics)
    ? rawMetrics
    : Array.isArray(data?.metricCards)
    ? data.metricCards
    : rawMetrics
    ? [
        {
          label: 'Total Registered Users',
          value: rawMetrics.totalUsers ?? 0,
          subtext: `${rawMetrics.activeAccounts ?? 0} active platform accounts`,
          icon: 'Users',
          color: 'sky'
        },
        {
          label: 'Active Students',
          value: rawMetrics.activeStudents ?? 0,
          subtext: 'Eligible for campus placement tests',
          icon: 'GraduationCap',
          color: 'teal'
        },
        {
          label: 'Test Attempts',
          value: rawMetrics.totalAttempts ?? 0,
          subtext: 'Completed mock tests & drills',
          icon: 'Activity',
          color: 'amber'
        },
        {
          label: 'Platform Pass Rate',
          value: `${rawMetrics.platformPassRate ?? 0}%`,
          subtext: 'Platform-wide cut-off compliance',
          icon: 'TrendingUp',
          color: 'emerald'
        }
      ]
    : [];
  const recentLogs = data?.recentAuditLogs || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-sky-700 dark:text-sky-400">
            SYSTEM ADMINISTRATION
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Platform Administration
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage user roles, monitor aptitude test participation, and inspect system audit logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/audit-logs')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-sky-600" />
            <span>Audit Logs</span>
          </button>
          <button
            onClick={() => navigate('/admin/users')}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Manage Users</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            subtext={m.subtext}
            icon={m.icon}
            color={m.color}
          />
        ))}
      </div>

      {/* Platform Security & Role Governance Notice */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
              ROLE & ACCESS GOVERNANCE
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              Strict Principle of Least Privilege
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
              Administrators oversee account status, role elevations, and security audits. Aptitude question authoring and spreadsheet publishing is strictly reserved for the T&P Coordinator role.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-xs hover:opacity-90 transition-opacity cursor-pointer shrink-0"
        >
          <span>Open User Accounts</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Recent Audit Logs Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 card-shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recent System Audit Events
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time administrative event ledger
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/audit-logs')}
            className="text-xs font-semibold text-teal-600 hover:underline cursor-pointer"
          >
            View full ledger →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/60 text-slate-400 uppercase font-semibold">
                <th className="pb-3 pl-1">Action</th>
                <th className="pb-3">Actor</th>
                <th className="pb-3">Event Details</th>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentLogs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                  <td className="py-3.5 pl-1 font-mono font-bold text-sky-600">
                    {log.action}
                  </td>
                  <td className="py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                    {log.performedBy}
                  </td>
                  <td className="py-3.5 text-slate-500 max-w-sm truncate">
                    {log.details}
                  </td>
                  <td className="py-3.5 text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5">
                    <Badge variant="teal">{log.targetType}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
