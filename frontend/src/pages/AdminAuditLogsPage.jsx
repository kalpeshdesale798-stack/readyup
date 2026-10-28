import { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, ShieldAlert, ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import { adminService } from '../services/adminService';
import Badge from '../components/common/Badge';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getAuditLogs({
        action: actionFilter || undefined,
        targetType: targetFilter || undefined
      });
      const logList = Array.isArray(res) ? res : (res?.data || []);
      setLogs(logList);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Failed to load audit logs from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, targetFilter]);

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const actor = typeof log.performedBy === 'string'
      ? log.performedBy
      : log.performedBy?.name || log.performedBy?.email || '';
    return (
      (log.action || '').toLowerCase().includes(q) ||
      actor.toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <span className="text-[11px] font-bold tracking-wider uppercase text-sky-700 dark:text-sky-400">
          IMMUTABLE PLATFORM AUDIT TRAIL
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
          System Audit Ledger
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Comprehensive compliance log of role changes, user activations, and content import events
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, action, or event details..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-teal-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="">All Actions</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="USER_REGISTER">USER_REGISTER</option>
            <option value="USER_CREATE">USER_CREATE</option>
            <option value="ROLE_CHANGE">ROLE_CHANGE</option>
            <option value="STATUS_CHANGE">STATUS_CHANGE</option>
            <option value="QUESTION_CREATE">QUESTION_CREATE</option>
            <option value="SPREADSHEET_IMPORT">SPREADSHEET_IMPORT</option>
          </select>

          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="">All Target Types</option>
            <option value="AUTH">Authentication (AUTH)</option>
            <option value="USER">User Accounts (USER)</option>
            <option value="QUESTION">Question Bank (QUESTION)</option>
            <option value="IMPORT">Spreadsheet Import (IMPORT)</option>
            <option value="TEST">Tests (TEST)</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadLogs}
            className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-200 hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-800 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Event Action</th>
                <th className="py-3.5 px-4">Actor / Performed By</th>
                <th className="py-3.5 px-4">Description &amp; Context</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Target Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 text-sky-600 animate-spin mx-auto mb-2" />
                    <p className="text-xs">Loading immutable audit ledger...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400">
                    <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                      No audit records found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search || actionFilter || targetFilter
                        ? 'Try clearing your search or filter criteria.'
                        : 'System events like user provisioning, role changes, and imports will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-600">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {typeof log.performedBy === 'string'
                        ? log.performedBy
                        : log.performedBy?.name || log.performedBy?.email || 'System'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-sm truncate">
                      {log.details}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="teal">{log.targetType}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
