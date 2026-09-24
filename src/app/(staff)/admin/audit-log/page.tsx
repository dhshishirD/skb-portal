'use client';

import { useState } from 'react';
import { History, Filter, ShieldCheck, Database, Calendar } from 'lucide-react';

interface AuditItem {
  id: number;
  occurredAt: string;
  actorName: string;
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  newData: string;
}

const MOCK_AUDIT_LOGS: AuditItem[] = [
  {
    id: 104,
    occurredAt: '2026-09-24 14:30:12',
    actorName: 'System Administrator',
    tableName: 'user_roles',
    recordId: '1000...004/field_officer',
    action: 'INSERT',
    newData: '{"user_id": "1000...004", "role": "field_officer"}',
  },
  {
    id: 103,
    occurredAt: '2026-09-24 14:15:00',
    actorName: 'System Administrator',
    tableName: 'user_project_access',
    recordId: '1000...00a/3000...001',
    action: 'INSERT',
    newData: '{"user_id": "1000...00a", "expires_at": "2026-10-24"}',
  },
  {
    id: 102,
    occurredAt: '2026-09-24 13:00:45',
    actorName: 'Rahim PM',
    tableName: 'projects',
    recordId: '3000...001',
    action: 'UPDATE',
    newData: '{"stage": "implementation"}',
  },
];

export default function AuditLogPage() {
  const [tableFilter, setTableFilter] = useState('all');
  const [logs] = useState<AuditItem[]>(MOCK_AUDIT_LOGS);

  const filteredLogs = tableFilter === 'all'
    ? logs
    : logs.filter((l) => l.tableName === tableFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Append-Only Audit Log Viewer
          </h1>
          <p className="text-xs text-slate-500">
            Immutable log of all database mutations, security triggers, and role changes.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" /> Filter Logs:
        </div>

        <div>
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Tables</option>
            <option value="user_roles">user_roles</option>
            <option value="user_project_access">user_project_access</option>
            <option value="projects">projects</option>
            <option value="grants">grants</option>
            <option value="profiles">profiles</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp (UTC)</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Record ID</th>
                <th className="px-4 py-3">Mutation Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-slate-500">{log.occurredAt}</td>
                  <td className="px-4 py-3 font-sans font-medium text-slate-900">{log.actorName}</td>
                  <td className="px-4 py-3 text-blue-600 font-semibold">{log.tableName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'INSERT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.action === 'UPDATE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{log.recordId}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{log.newData}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
