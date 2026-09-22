import React, { useState, useEffect, useCallback } from 'react';
import {
  AuditLog,
  AuditSeverity,
  CanonicalAuditAction,
  PaginatedAuditLogsResponse,
} from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { EmptyState } from '../ui/EmptyState';
import { fetchAuditLogsPaginated, AuditLogFilterOptions } from '../../api/client';
import {
  FileText,
  Search,
  Filter,
  Download,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  User,
  Server,
  Shield,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface AuditLogsViewProps {
  auditLogs?: AuditLog[];
  onRefresh?: () => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ onRefresh: parentRefresh }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Fetch paginated logs from server
  const loadLogs = useCallback(
    async (targetPage = page, targetLimit = limit) => {
      setIsLoading(true);
      try {
        let fromIso: string | undefined = fromDate ? new Date(fromDate).toISOString() : undefined;
        let toIso: string | undefined = toDate ? new Date(toDate + 'T23:59:59').toISOString() : undefined;

        if (datePreset === 'today') {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          fromIso = now.toISOString();
        } else if (datePreset === '24h') {
          fromIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        } else if (datePreset === '7days') {
          fromIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        } else if (datePreset === '30days') {
          fromIso = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
        }

        const params: AuditLogFilterOptions = {
          page: targetPage,
          limit: targetLimit,
          search: search.trim() || undefined,
          action: actionFilter !== 'all' ? actionFilter : undefined,
          actor: actorFilter !== 'all' ? actorFilter : undefined,
          targetType: targetTypeFilter !== 'all' ? targetTypeFilter : undefined,
          from: fromIso,
          to: toIso,
        };

        const res = await fetchAuditLogsPaginated(params);
        setLogs(res.logs || []);
        setTotal(res.total || 0);
        setPage(res.page || 1);
        setLimit(res.limit || targetLimit);
        setTotalPages(res.totalPages || Math.max(1, Math.ceil((res.total || 0) / (res.limit || targetLimit))));
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [page, limit, search, actionFilter, actorFilter, targetTypeFilter, datePreset, fromDate, toDate]
  );

  // Trigger fetch on filter or pagination changes
  useEffect(() => {
    loadLogs(page, limit);
  }, [page, limit, actionFilter, actorFilter, targetTypeFilter, datePreset, fromDate, toDate]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      loadLogs(1, limit);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const handleRefresh = () => {
    loadLogs(page, limit);
    if (parentRefresh) parentRefresh();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Action', 'Actor', 'Target Type', 'Target ID', 'Description', 'IP Address', 'Severity'];
    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.action || l.eventType}"`,
      `"${l.actor || l.adminEmail || 'SYSTEM'}"`,
      `"${l.targetType || 'SYSTEM'}"`,
      `"${l.targetId || l.profileId || 'N/A'}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${l.ipAddress || 'N/A'}"`,
      `"${l.severity}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FoundationPoly_VPN_AuditLog_Page${page}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            SUCCESS
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            WARNING
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3 h-3 text-blue-600" />
            INFO
          </span>
        );
    }
  };

  const getActionBadge = (action: string) => {
    let colorClass = 'bg-slate-100 text-slate-800 border-slate-200';
    if (action.includes('CREATED') || action.includes('STARTED') || action.includes('SUCCESS')) {
      colorClass = 'bg-green-50 text-green-800 border-green-200';
    } else if (action.includes('STOPPED') || action.includes('REVOKED') || action.includes('DISCONNECTED')) {
      colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
    } else if (action.includes('DELETED') || action.includes('FAILED')) {
      colorClass = 'bg-red-50 text-red-800 border-red-200';
    } else if (action.includes('RESTARTED') || action.includes('CONFIG')) {
      colorClass = 'bg-blue-50 text-blue-800 border-blue-200';
    }

    return (
      <span
        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${colorClass} tracking-tight whitespace-nowrap`}
      >
        {action}
      </span>
    );
  };

  const actionOptions: { label: string; value: CanonicalAuditAction }[] = [
    { label: 'Admin Login Success', value: 'ADMIN_LOGIN_SUCCESS' },
    { label: 'Admin Login Failed', value: 'ADMIN_LOGIN_FAILED' },
    { label: 'Admin Logout', value: 'ADMIN_LOGOUT' },
    { label: 'VPN Profile Created', value: 'VPN_PROFILE_CREATED' },
    { label: 'VPN Profile Updated', value: 'VPN_PROFILE_UPDATED' },
    { label: 'VPN Profile Revoked', value: 'VPN_PROFILE_REVOKED' },
    { label: 'VPN Profile Deleted', value: 'VPN_PROFILE_DELETED' },
    { label: 'VPN Config Generated', value: 'VPN_CONFIG_GENERATED' },
    { label: 'VPN Server Started', value: 'VPN_SERVER_STARTED' },
    { label: 'VPN Server Stopped', value: 'VPN_SERVER_STOPPED' },
    { label: 'VPN Server Restarted', value: 'VPN_SERVER_RESTARTED' },
    { label: 'Client Connected', value: 'VPN_CLIENT_CONNECTED' },
    { label: 'Client Disconnected', value: 'VPN_CLIENT_DISCONNECTED' },
  ];

  return (
    <div id="audit-logs-view" className="space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-audit"
              type="text"
              placeholder="Search audit trail by description, actor, target, IP, or metadata..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Refresh Button */}
            <button
              id="btn-refresh-audit"
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              title="Refresh audit trail"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Export CSV Button */}
            <button
              id="btn-export-audit-csv"
              onClick={handleExportCsv}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              title="Export current page to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wider text-[10px] mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Action Filter */}
          <select
            id="filter-audit-action"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none cursor-pointer"
          >
            <option value="all">All Actions</option>
            {actionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Actor Filter */}
          <select
            id="filter-audit-actor"
            value={actorFilter}
            onChange={(e) => {
              setActorFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none cursor-pointer"
          >
            <option value="all">All Actors</option>
            <option value="SYSTEM">SYSTEM (Kernel / Daemon)</option>
            <option value="admin@foundationpoly.edu.ng">admin@foundationpoly.edu.ng</option>
          </select>

          {/* Target Type Filter */}
          <select
            id="filter-audit-target-type"
            value={targetTypeFilter}
            onChange={(e) => {
              setTargetTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none cursor-pointer"
          >
            <option value="all">All Targets</option>
            <option value="VPN_PROFILE">VPN_PROFILE</option>
            <option value="VPN_SERVER">VPN_SERVER</option>
            <option value="AUTH">AUTH</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>

          {/* Date Presets */}
          <select
            id="filter-audit-date-preset"
            value={datePreset}
            onChange={(e) => {
              setDatePreset(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="24h">Past 24 Hours</option>
            <option value="7days">Past 7 Days</option>
            <option value="30days">Past 30 Days</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 ml-1">
              <input
                id="filter-audit-from"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-700 text-xs focus:outline-none"
                placeholder="From"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                id="filter-audit-to"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-700 text-xs focus:outline-none"
                placeholder="To"
              />
            </div>
          )}

          {/* Reset Filters */}
          {(actionFilter !== 'all' || actorFilter !== 'all' || targetTypeFilter !== 'all' || datePreset !== 'all' || search) && (
            <button
              id="btn-reset-audit-filters"
              onClick={() => {
                setActionFilter('all');
                setActorFilter('all');
                setTargetTypeFilter('all');
                setDatePreset('all');
                setFromDate('');
                setToDate('');
                setSearch('');
                setPage(1);
              }}
              className="text-blue-600 hover:text-blue-800 text-xs font-semibold underline ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table id="table-audit-logs" className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-44">Timestamp</th>
                <th className="py-3 px-4 w-48">Action</th>
                <th className="py-3 px-4 w-48">Actor</th>
                <th className="py-3 px-4 w-36">Target</th>
                <th className="py-3 px-4">Event Description</th>
                <th className="py-3 px-4 text-center w-24">Severity</th>
                <th className="py-3 px-4 text-right w-16">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                      <span>Loading audit records from SQLite database...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10">
                    <EmptyState
                      icon={FileText}
                      title="No audit events found"
                      description="No records matched your filtering or search parameters."
                    />
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionName = log.action || log.eventType || 'UNKNOWN';
                  const actorName = log.actor || log.adminEmail || 'SYSTEM';
                  const isExpanded = expandedLogId === log.id;
                  const isSystem = actorName === 'SYSTEM';

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        id={`log-row-${log.id}`}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isExpanded ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                          {formatDateTime(log.timestamp)}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getActionBadge(actionName)}
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isSystem ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                              <Server className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>SYSTEM</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-slate-800 font-sans font-medium text-[11px]">
                              <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate max-w-[160px]">{actorName}</span>
                            </span>
                          )}
                        </td>

                        {/* Target */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                          {log.targetType ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-slate-500">{log.targetType}:</span>
                              <span className="font-semibold text-slate-800">
                                {log.targetId ? log.targetId.slice(-8) : 'N/A'}
                              </span>
                            </span>
                          ) : log.profileName ? (
                            <span className="text-blue-600 font-sans font-medium">{log.profileName}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="py-3 px-4 font-sans text-slate-800 max-w-md break-words">
                          <p className="leading-snug">{log.description}</p>
                          {log.ipAddress && (
                            <span className="inline-block mt-0.5 text-[10px] text-slate-400 font-mono">
                              IP: {log.ipAddress}
                            </span>
                          )}
                        </td>

                        {/* Severity */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {getSeverityBadge(log.severity)}
                        </td>

                        {/* Expand Details Toggle */}
                        <td className="py-3 px-4 text-right">
                          <button
                            id={`btn-toggle-log-${log.id}`}
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            title="Inspect sanitized audit payload"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Details Row */}
                      {isExpanded && (
                        <tr id={`log-detail-${log.id}`} className="bg-slate-50/80 border-b border-slate-100">
                          <td colSpan={7} className="p-4">
                            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-2.5">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[11px]">
                                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                                  Audit Record Integrity Payload
                                </span>
                                <span className="font-mono text-slate-400">ID: {log.id}</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-600 text-[11px]">
                                <div>
                                  <span className="font-semibold text-slate-700 block">Action:</span>
                                  <span className="font-mono text-slate-900">{actionName}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-700 block">Actor:</span>
                                  <span className="font-mono text-slate-900">{actorName}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-700 block">Origin IP / Host:</span>
                                  <span className="font-mono text-slate-900">{log.ipAddress || 'Internal Loopback (127.0.0.1)'}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-700 block">Target Type:</span>
                                  <span className="font-mono text-slate-900">{log.targetType || 'SYSTEM'}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-700 block">Target ID:</span>
                                  <span className="font-mono text-slate-900">{log.targetId || log.profileId || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-700 block">Security Severity:</span>
                                  <span className="font-mono uppercase text-slate-900">{log.severity}</span>
                                </div>
                              </div>

                              {log.metadata && (
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                  <span className="font-semibold text-slate-700 block mb-1 text-[11px]">
                                    Sanitized Metadata (Keys / Secrets Excluded):
                                  </span>
                                  <pre className="p-2.5 bg-slate-900 text-slate-200 rounded font-mono text-[10px] overflow-x-auto">
                                    {typeof log.metadata === 'string'
                                      ? log.metadata
                                      : JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Showing{' '}
              <strong className="text-slate-900">
                {logs.length > 0 ? (page - 1) * limit + 1 : 0}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-900">
                {Math.min(page * limit, total)}
              </strong>{' '}
              of <strong className="text-slate-900">{total}</strong> records
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1 ml-3 pl-3 border-l border-slate-300">
              <span className="text-[11px] text-slate-500">Per page:</span>
              <select
                id="select-audit-page-size"
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-[11px] text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              id="btn-audit-prev-page"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-2 text-xs font-mono text-slate-700">
              Page {page} of {totalPages}
            </span>

            <button
              id="btn-audit-next-page"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
