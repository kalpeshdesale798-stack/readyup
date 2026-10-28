import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  Briefcase,
  GraduationCap,
  AlertCircle,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [error, setError] = useState('');

  // Form 11 Modal: Provisioning
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    department: 'Computer Science & Engineering',
    college: 'National Institute of Technology',
    studentId: ''
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Form 12 Modal: Role Assignment
  const [roleModal, setRoleModal] = useState({ open: false, user: null, newRole: 'student' });
  const [roleLoading, setRoleLoading] = useState(false);

  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminService.getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter !== '' ? statusFilter : undefined
      });
      setUsers(res || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadUsers();
  };

  // Form 11: Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (createForm.name.trim().length < 2) {
      setCreateError('Name must be at least 2 characters long');
      return;
    }
    if (!createForm.email.includes('@')) {
      setCreateError('Please enter a valid email address');
      return;
    }
    if (createForm.password.length < 8) {
      setCreateError('Password must be at least 8 characters long');
      return;
    }

    setCreateLoading(true);
    try {
      await adminService.createUser(createForm);
      addToast({
        title: 'User Provisioned',
        message: `Account created for ${createForm.name} (${createForm.role})`,
        type: 'success'
      });
      setCreateModalOpen(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        role: 'student',
        department: 'Computer Science & Engineering',
        college: 'National Institute of Technology',
        studentId: ''
      });
      loadUsers();
    } catch (err) {
      setCreateError(err.message || 'Failed to provision user');
    } finally {
      setCreateLoading(false);
    }
  };

  // Form 12: Role Assignment
  const handleRoleChangeSubmit = async (e) => {
    e.preventDefault();
    if (!roleModal.user) return;

    if (roleModal.user.email === currentUser?.email) {
      addToast({ title: 'Forbidden', message: 'You cannot change your own admin role.', type: 'warning' });
      setRoleModal({ open: false, user: null, newRole: 'student' });
      return;
    }

    setRoleLoading(true);
    try {
      await adminService.updateUserRole(roleModal.user._id, roleModal.newRole);
      addToast({
        title: 'Role Updated',
        message: `${roleModal.user.name} is now a ${roleModal.newRole}.`,
        type: 'success'
      });
      setRoleModal({ open: false, user: null, newRole: 'student' });
      loadUsers();
    } catch (err) {
      addToast({ title: 'Role Update Failed', message: err.message, type: 'error' });
    } finally {
      setRoleLoading(false);
    }
  };

  // Form 13: Status Toggle
  const handleToggleStatus = async (user) => {
    if (user.email === currentUser?.email) {
      addToast({ title: 'Forbidden', message: 'You cannot deactivate your own administrative account.', type: 'warning' });
      return;
    }

    try {
      const newStatus = !user.isActive;
      await adminService.updateUserStatus(user._id, newStatus);
      addToast({
        title: 'Account Status Updated',
        message: `${user.name} account marked ${newStatus ? 'Active' : 'Deactivated'}`,
        type: 'info'
      });
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isActive: newStatus } : u))
      );
    } catch (err) {
      addToast({ title: 'Status Update Failed', message: err.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-sky-700 dark:text-sky-400">
            ACCESS CONTROL & GOVERNANCE
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            User Accounts & Roles
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Provision staff credentials, assign coordinator permissions, and toggle account activation
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New User</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 card-shadow flex flex-col md:flex-row items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, email, or department..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-teal-500 text-slate-900 dark:text-white"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200"
          >
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="coordinator">Coordinator</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadUsers}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-semibold hover:bg-rose-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-800 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Department / Institute</th>
                <th className="py-3.5 px-4">ID / Roll No</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600 dark:text-teal-400" />
                    <p className="text-xs">Loading user accounts...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No user accounts found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search || roleFilter || statusFilter
                        ? 'Try clearing or modifying your search filters.'
                        : 'No accounts have been registered or provisioned yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {u.name}
                    </span>
                    <span className="text-slate-400 text-[11px] font-mono">{u.email}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={u.role === 'admin' ? 'blue' : u.role === 'coordinator' ? 'amber' : 'teal'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    <span className="block font-medium">{u.department || 'General'}</span>
                    <span className="text-[10px] text-slate-400">{u.college}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    {u.studentId || '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={u.isActive ? 'Passed' : 'Changes Requested'}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => setRoleModal({ open: true, user: u, newRole: u.role })}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      Assign Role
                    </button>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                        u.isActive
                          ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form 11: Provision User Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                  FORM 11: DIRECT USER PROVISIONING
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  Provision New Account
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="my-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Prof. Sunita Patil"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="sunita@readyup.edu"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    System Role *
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="student">Student</option>
                    <option value="coordinator">T&P Coordinator</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Employee / Roll No
                  </label>
                  <input
                    type="text"
                    value={createForm.studentId}
                    onChange={(e) => setCreateForm({ ...createForm, studentId: e.target.value })}
                    placeholder="EMP-TP-04"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  {createLoading ? 'Provisioning...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form 12: Role Assignment Modal */}
      {roleModal.open && roleModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-bold text-teal-600 uppercase">
                FORM 12: ROLE ASSIGNMENT
              </span>
              <button
                onClick={() => setRoleModal({ open: false, user: null, newRole: 'student' })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRoleChangeSubmit} className="space-y-4 pt-4">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {roleModal.user.name}
                </p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {roleModal.user.email}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign System Role
                </label>
                <select
                  value={roleModal.newRole}
                  onChange={(e) => setRoleModal({ ...roleModal, newRole: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="student">Student</option>
                  <option value="coordinator">T&P Coordinator</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleModal({ open: false, user: null, newRole: 'student' })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleLoading}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                >
                  {roleLoading ? 'Updating...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
