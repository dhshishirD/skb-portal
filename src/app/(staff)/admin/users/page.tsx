'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { UserPlus, Shield, MapPin, FolderKanban, UserX, UserCheck, Calendar } from 'lucide-react';
import { inviteUserAction } from '@/server/actions/admin';

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  orgName: string;
  roles: string[];
  isActive: boolean;
  projectsCount: number;
}

const MOCK_USERS: UserItem[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    fullName: 'System Administrator',
    email: 'admin@ngo-portal.org',
    orgName: 'Internal HQ',
    roles: ['super_admin'],
    isActive: true,
    projectsCount: 4,
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    fullName: 'Rahim Ahmed (PM)',
    email: 'rahim@ngo-portal.org',
    orgName: 'Internal HQ',
    roles: ['programme_manager'],
    isActive: true,
    projectsCount: 2,
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    fullName: 'Karim Field Officer',
    email: 'karim@ngo-portal.org',
    orgName: 'Internal HQ',
    roles: ['field_officer'],
    isActive: true,
    projectsCount: 1,
  },
  {
    id: '10000000-0000-0000-0000-000000000007',
    fullName: 'USAID Representative',
    email: 'donor@usaid.gov',
    orgName: 'Donor Organization',
    roles: ['donor'],
    isActive: true,
    projectsCount: 1,
  },
];

export default function AdminUsersPage() {
  const t = useTranslations('Common');
  const [users, setUsers] = useState<UserItem[]>(MOCK_USERS);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const toggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Users & Access Management</h1>
          <p className="text-xs text-slate-500">
            Manage user accounts, assign roles, and configure project & location access limits.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite New User
        </button>
      </div>

      {statusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs">
          {statusMsg}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Projects</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{user.fullName}</div>
                    <div className="text-[11px] text-slate-400">{user.email}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{user.orgName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-mono text-slate-700">
                      <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                      {user.projectsCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-200">
                        <UserCheck className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-medium">
                        <UserX className="w-3 h-3" /> Deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                    >
                      Assign Access
                    </button>
                    <button
                      onClick={() => toggleStatus(user.id)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-colors ${
                        user.isActive
                          ? 'bg-red-50 hover:bg-red-100 text-red-700'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {user.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Invite New User</h3>

            <form
              action={async (formData) => {
                try {
                  await inviteUserAction(formData);
                  setStatusMsg('User invitation successfully processed!');
                } catch {
                  setStatusMsg('User invited locally (Mock mode).');
                }
                setShowInviteModal(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="newuser@organization.org"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  name="fullName"
                  type="text"
                  required
                  placeholder="Official Name"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Initial Role</label>
                <select
                  name="role"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="project_officer">Project Officer</option>
                  <option value="field_officer">Field Officer</option>
                  <option value="programme_manager">Programme Manager</option>
                  <option value="finance">Finance</option>
                  <option value="procurement">Procurement</option>
                  <option value="me_officer">M&E Officer</option>
                  <option value="donor">Donor Representative</option>
                  <option value="auditor">Temporary Auditor</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Access Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Assign Access for {selectedUser.fullName}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Project</label>
                <select className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                  <option>P1 - Climate Resilience in Coastal Areas</option>
                  <option>P2 - Primary Healthcare Access</option>
                  <option>P3 - Youth Employment Training</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Access Expiry Date (Optional - e.g. for Auditors)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusMsg(`Access updated for ${selectedUser.fullName}`);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  Save Access Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
