import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { ClipboardList, RefreshCw, Filter, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface AuditEntry {
  id: number;
  action: string;
  node: string | null;
  vmid: number | null;
  username: string | null;
  details: Record<string, any> | null;
  status: 'success' | 'failure';
  error_message: string | null;
  timestamp: string;
}

const actionColor: Record<string, string> = {
  login:           'bg-blue-100 text-blue-700',
  vm_create:       'bg-green-100 text-green-700',
  vm_delete:       'bg-red-100 text-red-700',
  vm_clone:        'bg-indigo-100 text-indigo-700',
  vm_start:        'bg-emerald-100 text-emerald-700',
  vm_stop:         'bg-orange-100 text-orange-700',
  vm_shutdown:     'bg-amber-100 text-amber-700',
  vm_reboot:       'bg-yellow-100 text-yellow-700',
  vm_suspend:      'bg-purple-100 text-purple-700',
  vm_resume:       'bg-teal-100 text-teal-700',
  snapshot_create: 'bg-cyan-100 text-cyan-700',
  snapshot_revert: 'bg-pink-100 text-pink-700',
  snapshot_delete: 'bg-rose-100 text-rose-700',
  disk_add:        'bg-lime-100 text-lime-700',
  disk_delete:     'bg-red-100 text-red-700',
  disk_expand:     'bg-violet-100 text-violet-700',
  disk_activate:   'bg-sky-100 text-sky-700',
  nic_remove:      'bg-gray-100 text-gray-700',
  nic_update:      'bg-slate-100 text-slate-700',
  vm_config_update:'bg-blue-100 text-blue-700',
};

const fetchAuditLog = async (params: { vmid?: number; node?: string; action?: string; limit: number; offset: number }): Promise<AuditEntry[]> => {
  const { data } = await api.get<AuditEntry[]>(`/audit-log`, { params });
  return data;
};

const AuditLogView = () => {
  const [filterAction, setFilterAction] = useState('');
  const [filterVmid, setFilterVmid] = useState('');
  const [limit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const queryParams = {
    limit,
    offset,
    ...(filterAction ? { action: filterAction } : {}),
    ...(filterVmid && !isNaN(Number(filterVmid)) ? { vmid: Number(filterVmid) } : {}),
  };

  const { data: entries, isLoading, error, refetch, isFetching } = useQuery<AuditEntry[]>({
    queryKey: ['audit-log', queryParams],
    queryFn: () => fetchAuditLog(queryParams),
    retry: 1,
  });

  const handleFilter = () => { setOffset(0); refetch(); };

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Audit Log</h2>
          <p className="text-sm text-gray-500 mt-0.5">Track all state-changing actions across the platform</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium
                     text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter size={15} />
            <span className="font-medium">Filter:</span>
          </div>
          <input
            type="text"
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            placeholder="Action (e.g. vm_create)"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 w-52
                       focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
          />
          <input
            type="text"
            value={filterVmid}
            onChange={e => setFilterVmid(e.target.value)}
            placeholder="VM ID"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 w-28
                       focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
          />
          <button
            onClick={handleFilter}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold
                       rounded-lg transition-colors"
          >
            Apply
          </button>
          {(filterAction || filterVmid) && (
            <button
              onClick={() => { setFilterAction(''); setFilterVmid(''); setOffset(0); }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100
                         rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
          {entries && (
            <span className="ml-auto text-xs text-gray-400 font-medium">
              {entries.length} record{entries.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
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
            <p className="text-sm font-medium text-gray-600">Could not load audit log</p>
            <p className="text-xs text-gray-400">Make sure the backend is running and the DB is connected.</p>
          </div>
        )}
        {!isLoading && !error && (
          <>
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['', 'Time', 'Action', 'Node', 'VM ID', 'User', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries && entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                      <ClipboardList size={28} className="mx-auto mb-2 text-gray-300" />
                      No audit log entries yet. Perform any action to generate logs.
                    </td>
                  </tr>
                )}
                {entries?.map(entry => {
                  const isExpanded = expandedId === entry.id;
                  const hasDetails = entry.details && Object.keys(entry.details).length > 0;
                  const actionBadge = actionColor[entry.action] ?? 'bg-gray-100 text-gray-700';

                  return (
                    <React.Fragment key={entry.id}>
                      <tr
                        className={`hover:bg-gray-50 transition-colors ${hasDetails ? 'cursor-pointer' : ''}`}
                        onClick={() => hasDetails && setExpandedId(isExpanded ? null : entry.id)}
                      >
                        {/* Expand toggle */}
                        <td className="pl-4 pr-2 py-3 w-8">
                          {hasDetails && (
                            <span className="text-gray-400">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                          )}
                        </td>
                        {/* Timestamp */}
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleString(undefined, {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                          })}
                        </td>
                        {/* Action badge */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${actionBadge}`}>
                            {entry.action}
                          </span>
                        </td>
                        {/* Node */}
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {entry.node ?? <span className="text-gray-300">—</span>}
                        </td>
                        {/* VM ID */}
                        <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                          {entry.vmid ?? <span className="text-gray-300">—</span>}
                        </td>
                        {/* Username */}
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {entry.username ?? <span className="text-gray-300 italic">anonymous</span>}
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold
                            ${entry.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${entry.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                            {entry.status}
                          </span>
                        </td>
                      </tr>

                      {/* Details expansion row */}
                      {isExpanded && hasDetails && (
                        <tr className="bg-gray-50">
                          <td colSpan={7} className="px-8 py-3">
                            <div className="text-xs text-gray-600 font-mono bg-white border border-gray-200
                                            rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                              {JSON.stringify(entry.details, null, 2)}
                            </div>
                            {entry.error_message && (
                              <div className="mt-2 flex items-start gap-2 text-xs text-red-600">
                                <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                                {entry.error_message}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {entries && entries.length === limit && (
              <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700
                             hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-xs text-gray-500">Page {Math.floor(offset / limit) + 1}</span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700
                             hover:bg-gray-50 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogView;
