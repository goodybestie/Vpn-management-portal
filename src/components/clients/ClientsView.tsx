import React, { useState, useEffect } from 'react';
import { VpnProfile, ConnectedClientPeer, PeerConnectionStatus } from '../../types';
import { fetchConnectedClients } from '../../api/client';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import { formatBytes, formatRelativeTime } from '../../utils/formatters';
import {
  Radio,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Clock,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

interface ClientsViewProps {
  profiles: VpnProfile[];
  onRefresh: () => void;
  onSelectProfile: (profile: VpnProfile) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  profiles: initialProfiles,
  onRefresh,
  onSelectProfile,
}) => {
  const [clients, setClients] = useState<ConnectedClientPeer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'offline' | 'never_connected' | 'peer_not_found' | 'unknown'>('all');

  // Load connected clients directly from GET /api/vpn/clients
  const loadLiveClients = async (silent = false) => {
    if (!silent) setIsPolling(true);
    try {
      const data = await fetchConnectedClients();
      setClients(data as unknown as ConnectedClientPeer[]);
    } catch {
      // If endpoint fails, fall back to passed profiles mapped with connection statuses
      if (clients.length === 0 && initialProfiles.length > 0) {
        setClients(
          initialProfiles.map((p) => ({
            id: p.id,
            profileId: p.id,
            student: {
              id: p.id,
              name: p.fullName,
              studentId: p.studentId,
              department: p.department,
              email: p.email,
              phone: p.phone,
              description: p.description,
              status: p.status,
            },
            fullName: p.fullName,
            studentId: p.studentId,
            department: p.department,
            email: p.email,
            phone: p.phone,
            description: p.description,
            vpnIp: p.vpnIp,
            publicKey: p.publicKey,
            connectionStatus: (p.isConnected ? 'CONNECTED' : p.lastHandshake ? 'OFFLINE' : 'NEVER_CONNECTED') as PeerConnectionStatus,
            status: p.status,
            isConnected: p.isConnected,
            latestHandshake: p.lastHandshake,
            latestHandshakeEpoch: p.lastHandshake ? Math.floor(new Date(p.lastHandshake).getTime() / 1000) : 0,
            lastSeen: p.lastHandshake,
            bytesReceived: p.bytesReceived,
            bytesSent: p.bytesSent,
            totalTraffic: p.bytesReceived + p.bytesSent,
            totalBytes: p.bytesReceived + p.bytesSent,
            endpoint: p.endpoint,
            isUnknownPeer: false,
          }))
        );
      }
    } finally {
      setIsLoading(false);
      setIsPolling(false);
    }
  };

  // Initial fetch and 10-second background polling while this page is open (Requirement 10)
  useEffect(() => {
    loadLiveClients(false);
    const interval = setInterval(() => {
      loadLiveClients(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    loadLiveClients(false);
    onRefresh();
  };

  // Filter clients based on status and search query
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.studentId.toLowerCase().includes(search.toLowerCase()) ||
      c.vpnIp.includes(search) ||
      c.publicKey.toLowerCase().includes(search.toLowerCase()) ||
      (c.endpoint && c.endpoint.toLowerCase().includes(search.toLowerCase()));

    let matchesFilter = true;
    if (statusFilter === 'connected') matchesFilter = c.connectionStatus === 'CONNECTED';
    else if (statusFilter === 'offline') matchesFilter = c.connectionStatus === 'OFFLINE';
    else if (statusFilter === 'never_connected') matchesFilter = c.connectionStatus === 'NEVER_CONNECTED';
    else if (statusFilter === 'peer_not_found') matchesFilter = c.connectionStatus === 'PEER NOT FOUND';
    else if (statusFilter === 'unknown') matchesFilter = !!c.isUnknownPeer;

    return matchesSearch && matchesFilter;
  });

  const connectedCount = clients.filter((c) => c.connectionStatus === 'CONNECTED').length;
  const offlineCount = clients.filter((c) => c.connectionStatus === 'OFFLINE').length;
  const neverCount = clients.filter((c) => c.connectionStatus === 'NEVER_CONNECTED').length;
  const missingCount = clients.filter((c) => c.connectionStatus === 'PEER NOT FOUND').length;
  const unknownCount = clients.filter((c) => c.isUnknownPeer).length;

  return (
    <div id="clients-view" className="space-y-5">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-clients"
            type="text"
            placeholder="Search peers by student name, matric ID, VPN IP, endpoint, or public key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            All Peers ({clients.length})
          </button>
          <button
            onClick={() => setStatusFilter('connected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'connected'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Connected ({connectedCount})
          </button>
          <button
            onClick={() => setStatusFilter('offline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'offline'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Offline ({offlineCount})
          </button>
          <button
            onClick={() => setStatusFilter('never_connected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'never_connected'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            Never ({neverCount})
          </button>
          {missingCount > 0 && (
            <button
              onClick={() => setStatusFilter('peer_not_found')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'peer_not_found'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
              }`}
            >
              Peer Missing ({missingCount})
            </button>
          )}
          {unknownCount > 0 && (
            <button
              onClick={() => setStatusFilter('unknown')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'unknown'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              Unknown ({unknownCount})
            </button>
          )}

          <button
            id="btn-refresh-clients"
            onClick={handleManualRefresh}
            disabled={isPolling}
            title="Refresh WireGuard peer statistics"
            className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Discrepancy Warnings if any */}
      {missingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">WireGuard Configuration Discrepancy Detected:</span>
            <p className="mt-0.5 text-amber-700">
              {missingCount} database profile(s) have status <span className="font-semibold">ACTIVE</span>, but their public keys are not currently loaded into the active WireGuard interface (<code className="font-mono font-semibold">PEER NOT FOUND</code>). The interface has not been automatically altered.
            </p>
          </div>
        </div>
      )}

      {unknownCount > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Unregistered WireGuard Peers:</span>
            <p className="mt-0.5 text-purple-700">
              {unknownCount} peer(s) are active on the WireGuard interface without a matching profile in the SQLite database. Preserved non-destructively for administrative auditing.
            </p>
          </div>
        </div>
      )}

      {/* Connected Clients Grid / Table (Section 1 & 10) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table id="table-connected-clients" className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Student / Profile</th>
                <th className="py-3 px-4">VPN IP</th>
                <th className="py-3 px-4">WireGuard Public Key</th>
                <th className="py-3 px-4">Endpoint</th>
                <th className="py-3 px-4">Connection Status</th>
                <th className="py-3 px-4">Latest Handshake</th>
                <th className="py-3 px-4">Data Received</th>
                <th className="py-3 px-4">Data Sent</th>
                <th className="py-3 px-4">Total Traffic</th>
                <th className="py-3 px-4">Last Seen</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Querying live WireGuard peer statistics...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8">
                    <EmptyState
                      icon={Radio}
                      title="No peers found"
                      description="No WireGuard clients match the selected connection filter."
                    />
                  </td>
                </tr>
              ) : (
                filteredClients.map((c) => (
                  <tr
                    key={c.id}
                    id={`client-row-${c.id}`}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => {
                      if (c.profileId) {
                        onSelectProfile(c as unknown as VpnProfile);
                      }
                    }}
                  >
                    {/* 1. Student / Profile */}
                    <td className="py-3 px-4">
                      {c.isUnknownPeer ? (
                        <div>
                          <span className="font-semibold text-purple-700 block">Unknown Peer (External)</span>
                          <span className="text-[10px] font-mono text-slate-400 block">Unregistered in DB</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-slate-900 block">{c.fullName}</span>
                          <span className="text-[11px] font-mono text-slate-500 block">{c.studentId}</span>
                          <span className="text-[10px] text-slate-400 block">{c.department}</span>
                        </div>
                      )}
                    </td>

                    {/* 2. VPN IP */}
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {c.vpnIp}
                    </td>

                    {/* 3. WireGuard Public Key */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      <span className="truncate max-w-[110px] block" title={c.publicKey}>
                        {c.publicKey.substring(0, 16)}...
                      </span>
                    </td>

                    {/* 4. Endpoint */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {c.endpoint ? (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {c.endpoint}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>

                    {/* 5. Connection Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={c.connectionStatus} />
                    </td>

                    {/* 6. Latest Handshake */}
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {c.connectionStatus === 'CONNECTED' ? (
                        <span className="text-emerald-700 flex items-center gap-1 font-sans font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                          Active Now
                        </span>
                      ) : c.latestHandshake ? (
                        <span title={new Date(c.latestHandshake).toLocaleString()}>
                          {formatRelativeTime(c.latestHandshake)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic font-sans">Never</span>
                      )}
                    </td>

                    {/* 7. Data Received */}
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      <div className="flex items-center gap-1">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        {formatBytes(c.bytesReceived)}
                      </div>
                    </td>

                    {/* 8. Data Sent */}
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      <div className="flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        {formatBytes(c.bytesSent)}
                      </div>
                    </td>

                    {/* 9. Total Traffic */}
                    <td className="py-3 px-4 text-slate-900 font-mono font-bold">
                      {formatBytes(c.totalTraffic)}
                    </td>

                    {/* 10. Last Seen */}
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                      {c.lastSeen ? (
                        <span title={new Date(c.lastSeen).toLocaleString()}>
                          {formatRelativeTime(c.lastSeen)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Never</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {c.profileId ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProfile(c as unknown as VpnProfile);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded text-[11px] font-semibold border border-slate-300 shadow-xs transition-colors"
                        >
                          Inspect
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">External</span>
                      )}
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
};
