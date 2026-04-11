import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { Users, Plus, Pencil, Trash2, ShieldCheck, Eye, Settings, X, Check, AlertCircle, type LucideIcon } from 'lucide-react';

type Role = 'admin' | 'operator' | 'viewer';

interface AppUser {
  id: number;
  username: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

interface UserManagementViewProps {
  addAlert: (message: string, type: string) => void;
}

const roleConfig: Record<Role, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  admin:    { label: 'Admin',    icon: ShieldCheck, color: 'text-purple-700', bg: 'bg-purple-100' },
  operator: { label: 'Operator', icon: Settings,    color: 'text-blue-700',   bg: 'bg-blue-100'   },
  viewer:   { label: 'Viewer',   icon: Eye,         color: 'text-gray-600',   bg: 'bg-gray-100'   },
};

const fetchUsers = async (): Promise<AppUser[]> => {
  const { data } = await api.get<AppUser[]>(`/users`);
  return data;
};

const CreateUserModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (msg: string) => void;
}) => {
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', role: 'viewer' as Role });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError('Username and password are required.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post(`/users`, { username: form.username, password: form.password, role: form.role });
      onCreated(`User "${form.username}" created successfully.`);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">New User</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              placeholder="e.g. john.doe"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Confirm Password
              {form.confirmPassword && (
                <span className={`ml-2 font-normal normal-case ${form.password === form.confirmPassword ? 'text-green-500' : 'text-red-500'}`}>
                  {form.password === form.confirmPassword ? '✓ match' : '✗ mismatch'}
                </span>
              )}
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors
                         ${form.confirmPassword && form.password !== form.confirmPassword
                           ? 'border-red-300 focus:ring-red-500/30 focus:border-red-400'
                           : 'border-gray-300 focus:ring-blue-500/30 focus:border-blue-500'}`}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as Role })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors bg-white"
            >
              <option value="viewer">Viewer</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700
                         hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold
                         transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <><Check size={15} /> Create</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserManagementView = ({ addAlert }: UserManagementViewProps) => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<Role>('viewer');

  const { data: users, isLoading, error } = useQuery<AppUser[]>({
    queryKey: ['app-users'],
    queryFn: fetchUsers,
    retry: 1,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: Role }) => {
      await api.patch(`/users/${id}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-users'] });
      addAlert('User role updated.', 'success');
      setEditingId(null);
    },
    onError: () => addAlert('Failed to update role.', 'error'),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/users/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-users'] });
      addAlert('User deactivated.', 'success');
    },
    onError: () => addAlert('Failed to deactivate user.', 'error'),
  });

  const startEdit = (user: AppUser) => {
    setEditingId(user.id);
    setEditRole(user.role);
  };

  const confirmEdit = (id: number) => updateRoleMutation.mutate({ id, role: editRole });

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage application users, roles, and permissions</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white
                     rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-blue-200
                     focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add User
        </button>
      </div>

      {/* Role legend */}
      <div className="flex gap-4 mb-5">
        {(Object.entries(roleConfig) as [Role, typeof roleConfig[Role]][]).map(([role, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={role} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.color}`}>
              <Icon size={13} />
              {cfg.label}
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <AlertCircle size={32} className="text-red-300" />
            <p className="text-sm font-medium text-gray-600">Could not load users</p>
            <p className="text-xs text-gray-400">User management API endpoints are not yet configured on the backend.</p>
          </div>
        )}
        {!isLoading && !error && (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Username', 'Role', 'Status', 'Created', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm">
                    No users yet. Add one to get started.
                  </td>
                </tr>
              )}
              {users?.map(user => {
                const cfg = roleConfig[user.role] ?? roleConfig.viewer;
                const RoleIcon = cfg.icon;
                const isEditing = editingId === user.id;
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    {/* Username */}
                    <td className="px-5 py-3.5 font-medium text-gray-900">{user.username}</td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value as Role)}
                          className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white
                                     focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="operator">Operator</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                          <RoleIcon size={12} />
                          {cfg.label}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                                        ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>

                    {/* Last login */}
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : <span className="text-gray-300 italic">Never</span>
                      }
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => confirmEdit(user.id)}
                              disabled={updateRoleMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700
                                         text-white rounded-lg text-xs font-medium transition-colors"
                            >
                              <Check size={13} /> Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-300
                                         text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                            >
                              <X size={13} /> Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(user)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit role"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => deactivateMutation.mutate(user.id)}
                              disabled={deactivateMutation.isPending}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Deactivate user"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={msg => {
            addAlert(msg, 'success');
            queryClient.invalidateQueries({ queryKey: ['app-users'] });
          }}
        />
      )}
    </div>
  );
};

export default UserManagementView;
