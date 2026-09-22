import React, { useState, useEffect } from 'react';
import { VpnProfile, TrafficSnapshot, TrafficResponse, TrafficClientBreakdown } from '../../types';
import { fetchTrafficData } from '../../api/client';
import { formatBytes, formatRelativeTime, formatDateTime } from '../../utils/formatters';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpDown,
  Search,
  BarChart3,
  Lock,
  EyeOff,
  RefreshCw,
  Clock,
  Filter,
  Users,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

interface TrafficViewProps {
  profiles: VpnProfile[];
  snapshots: TrafficSnapshot[];
  onRefresh: () => void;
  onSelectProfile: (profile: VpnProfile) => void;
}

export const TrafficView: React.FC<TrafficViewProps> = ({
  profiles: initialProfiles,
  snapshots: initialSnapshots,
  onRefresh,
  onSelectProfile,
}) => {
  const [trafficData, setTrafficData] = useState<TrafficResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | 'all'>('all');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');

  // Load real traffic data from GET /api/traffic
  const loadTraffic = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      let fromDate: string | undefined;
      const now = Date.now();
      if (timeRange === '1h') fromDate = new Date(now - 3600 * 1000).toISOString();
      else if (timeRange === '6h') fromDate = new Date(now - 6 * 3600 * 1000).toISOString();
      else if (timeRange === '24h') fromDate = new Date(now - 24 * 3600 * 1000).toISOString();

      const data = await fetchTrafficData({
        profileId: selectedClientFilter !== 'all' ? selectedClientFilter : undefined,
        from: fromDate,
      });
      setTrafficData(data);
    } catch {
      // Fallback to initial props if API call encounters transient error
      if (!trafficData) {
        const totalRx = initialProfiles.reduce((s, p) => s + p.bytesReceived, 0);
        const totalTx = initialProfiles.reduce((s, p) => s + p.bytesSent, 0);
        setTrafficData({
          summary: {
            totalReceived: totalRx,
            totalTransmitted: totalTx,
            totalTraffic: totalRx + totalTx,
            activeClients: initialProfiles.filter((p) => p.isConnected).length,
            totalProfiles: initialProfiles.length,
          },
          clientBreakdown: initialProfiles.map((p) => ({
            id: p.id,
            name: p.fullName,
            studentId: p.studentId,
            department: p.department,
            vpnIp: p.vpnIp,
            status: p.status,
            bytesReceived: p.bytesReceived,
            bytesSent: p.bytesSent,
            totalBytes: p.bytesReceived + p.bytesSent,
            lastHandshake: p.lastHandshake,
            isConnected: p.isConnected,
            endpoint: p.endpoint,
            connectionStatus: (p.isConnected ? 'CONNECTED' : p.lastHandshake ? 'OFFLINE' : 'NEVER_CONNECTED') as any,
          })),
          historySnapshots: initialSnapshots,
          privacyStatement:
            'Auditing compliance: Traffic data records cryptographic packet volume metadata and connection timestamps only.',
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTraffic(false);
    const interval = setInterval(() => {
      loadTraffic(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [timeRange, selectedClientFilter]);

  const handleManualRefresh = () => {
    loadTraffic(false);
    onRefresh();
  };

  const summary = trafficData?.summary || {
    totalReceived: initialProfiles.reduce((s, p) => s + p.bytesReceived, 0),
    totalTransmitted: initialProfiles.reduce((s, p) => s + p.bytesSent, 0),
    totalTraffic: initialProfiles.reduce((s, p) => s + p.bytesReceived + p.bytesSent, 0),
    activeClients: initialProfiles.filter((p) => p.isConnected).length,
    totalProfiles: initialProfiles.length,
  };

  const clientList: TrafficClientBreakdown[] = trafficData?.clientBreakdown || initialProfiles.map((p) => ({
    id: p.id,
    name: p.fullName,
    studentId: p.studentId,
    department: p.department,
    vpnIp: p.vpnIp,
    status: p.status,
    bytesReceived: p.bytesReceived,
    bytesSent: p.bytesSent,
    totalBytes: p.bytesReceived + p.bytesSent,
    lastHandshake: p.lastHandshake,
    isConnected: p.isConnected,
    endpoint: p.endpoint,
    connectionStatus: (p.isConnected ? 'CONNECTED' : p.lastHandshake ? 'OFFLINE' : 'NEVER_CONNECTED') as any,
  }));

  const snapshots = trafficData?.historySnapshots || initialSnapshots;

  // Filter per-client breakdown table
  const filteredClients = clientList.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.studentId.toLowerCase().includes(search.toLowerCase()) ||
      p.vpnIp.includes(search) ||
      p.department.toLowerCase().includes(search.toLowerCase()) ||
      (p.endpoint && p.endpoint.toLowerCase().includes(search.toLowerCase()))
  );

  // Top Active Clients Chart (Top 7 by cumulative WireGuard traffic)
  const clientBarData = [...clientList]
    .sort((a, b) => b.totalBytes - a.totalBytes)
    .slice(0, 7)
    .map((p) => ({
      name: p.name.split(' ')[0] + ' ' + (p.name.split(' ')[1]?.[0] || '') + '.',
      studentId: p.studentId,
      receivedMB: parseFloat((p.bytesReceived / (1024 * 1024)).toFixed(2)),
      transmittedMB: parseFloat((p.bytesSent / (1024 * 1024)).toFixed(2)),
      totalMB: parseFloat((p.totalBytes / (1024 * 1024)).toFixed(2)),
    }));

  // Historical snapshots formatted for Recharts (Real data only, NO mock data!)
  const timeSeriesData = snapshots.map((s) => ({
    time: new Date(s.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    fullTime: formatDateTime(s.timestamp),
    client: s.profileName,
    receivedMB: parseFloat((s.bytesReceived / (1024 * 1024)).toFixed(2)),
    transmittedMB: parseFloat((s.bytesSent / (1024 * 1024)).toFixed(2)),
    totalMB: parseFloat((s.totalBytes / (1024 * 1024)).toFixed(2)),
  }));

  return (
    <div id="traffic-view" className="space-y-6">
      {/* Strict Privacy & Cryptographic Auditing Statement */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Academic Traffic Auditing & Privacy Compliance
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-semibold">
                  Zero Payload Inspection
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                In strict adherence to academic confidentiality and network ethics, this portal audits 
                <strong> cryptographic packet volume metadata</strong> (bytes received & transmitted) and connection timestamps only.
                The system does <em>not</em> inspect, record, or decrypt passwords, HTTPS contents, private messaging, personal files, or keystrokes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
            <EyeOff className="w-4 h-4 text-blue-600" />
            <span>End-to-End ChaCha20-Poly1305 Tunnels</span>
          </div>
        </div>
      </div>

      {/* Distinction Banner: Cumulative Counters vs Snapshot History */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-bold">Metric Distinction Notice:</span>
          <p className="mt-0.5 text-blue-800 leading-relaxed">
            The top summary cards reflect <span className="font-semibold">cumulative interface & peer counters</span> maintained by the WireGuard kernel/service since tunnel initialization. The time-series graph below plots <span className="font-semibold">discrete periodic snapshots</span> captured in SQLite every 15 seconds.
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="p-1 bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 rounded shadow-xs shrink-0 transition-colors"
          title="Refresh metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Primary Traffic Volume Summary Cards (Cumulative Counters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rx */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              DATA RECEIVED (RX)
            </span>
            <span className="text-2xl font-bold text-blue-600 mt-1 block font-mono">
              {formatBytes(summary.totalReceived)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Cumulative downlink from peers
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Total Tx */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              DATA TRANSMITTED (TX)
            </span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block font-mono">
              {formatBytes(summary.totalTransmitted)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Cumulative uplink to peers
            </span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-lg">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Total Traffic */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              TOTAL AUDITED TRAFFIC
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block font-mono">
              {formatBytes(summary.totalTraffic)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Combined WireGuard volume
            </span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-lg">
            <ArrowUpDown className="w-5 h-5" />
          </div>
        </div>

        {/* Active vs Offline Peers */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              ACTIVE PEERS / TOTAL
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-emerald-600 font-mono">
                {summary.activeClients}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / {summary.totalProfiles}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {summary.totalProfiles - summary.activeClients} peer(s) currently offline
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Dual Charts Grid: Traffic by Client & Real Snapshots Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Traffic Volume by Client */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  Cumulative Traffic by Peer (Top Active)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Actual WireGuard transfer Rx (downlink) vs Tx (uplink) in Megabytes
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              {clientBarData.length === 0 || clientBarData.every((c) => c.totalMB === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <BarChart3 className="w-8 h-8 stroke-1 mb-2 text-slate-300" />
                  <span>No client traffic recorded on the interface yet.</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientBarData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}M`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '12px',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                      }}
                      formatter={(val: any, name: any) => [
                        `${val} MB`,
                        name === 'receivedMB' ? 'Data Received' : 'Data Transmitted',
                      ]}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', color: '#475569' }} />
                    <Bar dataKey="receivedMB" name="Received (Rx)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="transmittedMB" name="Transmitted (Tx)" fill="#64748b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2 text-right">
            Based on WireGuard kernel transfer counters
          </div>
        </div>

        {/* Chart 2: Traffic Over Time (Real SQLite Snapshots with Filter Controls) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Audited Traffic Snapshots Over Time
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Discrete periodic snapshots recorded in SQLite
                </p>
              </div>

              {/* Snapshot Time Filters */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold text-slate-600">
                <button
                  onClick={() => setTimeRange('1h')}
                  className={`px-2 py-1 rounded transition-colors ${
                    timeRange === '1h' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  1h
                </button>
                <button
                  onClick={() => setTimeRange('6h')}
                  className={`px-2 py-1 rounded transition-colors ${
                    timeRange === '6h' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  6h
                </button>
                <button
                  onClick={() => setTimeRange('24h')}
                  className={`px-2 py-1 rounded transition-colors ${
                    timeRange === '24h' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  24h
                </button>
                <button
                  onClick={() => setTimeRange('all')}
                  className={`px-2 py-1 rounded transition-colors ${
                    timeRange === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              {timeSeriesData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 bg-slate-50/50 rounded border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 text-slate-300 mb-2 stroke-1" />
                  <span className="text-xs font-semibold text-slate-700">No traffic history recorded yet</span>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    Snapshots are recorded automatically while the service is running.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="timeTotalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}M`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '12px',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                      }}
                      formatter={(val: any) => [`${val} MB`, 'Snapshot Volume']}
                      labelFormatter={(_label, items) => {
                        const item = items?.[0]?.payload;
                        return item ? `${item.fullTime} (${item.client})` : '';
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalMB"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#timeTotalGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>{timeSeriesData.length} snapshot point(s) recorded in SQLite</span>
            <span>Recorded interval: 15s</span>
          </div>
        </div>
      </div>

      {/* Per-Client Auditing Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Per-Client Traffic Auditing Table
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Live WireGuard session volume and endpoint telemetry per student/profile
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filter by Client Dropdown */}
            <div className="relative">
              <select
                value={selectedClientFilter}
                onChange={(e) => setSelectedClientFilter(e.target.value)}
                className="pl-2.5 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Clients ({clientList.length})</option>
                {clientList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.vpnIp})
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-traffic-search"
                type="text"
                placeholder="Filter by name, ID, or IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table id="table-traffic-audit" className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Matric / Student ID</th>
                <th className="py-3 px-4">VPN IP</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Bytes Received (Rx)</th>
                <th className="py-3 px-4">Bytes Sent (Tx)</th>
                <th className="py-3 px-4">Total Bytes</th>
                <th className="py-3 px-4">Last Handshake</th>
                <th className="py-3 px-4">Latest Active Endpoint</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8">
                    <EmptyState
                      icon={BarChart3}
                      title="No client traffic records"
                      description="No profiles match the specified search or filter criteria."
                    />
                  </td>
                </tr>
              ) : (
                filteredClients.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      id={`traffic-row-${p.id}`}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => {
                        const prof = initialProfiles.find((x) => x.id === p.id);
                        if (prof) onSelectProfile(prof);
                      }}
                    >
                      {/* 1. Student Name */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {p.name}
                      </td>

                      {/* 2. Matric / Student ID */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {p.studentId}
                      </td>

                      {/* 3. VPN IP */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {p.vpnIp}
                      </td>

                      {/* 4. Current Status */}
                      <td className="py-3 px-4">
                        {p.connectionStatus ? (
                          <StatusBadge status={p.connectionStatus} />
                        ) : p.isConnected ? (
                          <StatusBadge status="connected" customLabel="CONNECTED" />
                        ) : p.status === 'revoked' ? (
                          <StatusBadge status="revoked" />
                        ) : p.lastHandshake ? (
                          <StatusBadge status="offline" customLabel="OFFLINE" />
                        ) : (
                          <StatusBadge status="never_connected" customLabel="NEVER CONNECTED" />
                        )}
                      </td>

                      {/* 5. Bytes Received */}
                      <td className="py-3 px-4 text-blue-600 font-mono font-medium">
                        <div className="flex items-center gap-1">
                          <ArrowDownLeft className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                          {formatBytes(p.bytesReceived)}
                        </div>
                      </td>

                      {/* 6. Bytes Sent */}
                      <td className="py-3 px-4 text-slate-700 font-mono font-medium">
                        <div className="flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          {formatBytes(p.bytesSent)}
                        </div>
                      </td>

                      {/* 7. Total Bytes */}
                      <td className="py-3 px-4 text-slate-900 font-mono font-bold">
                        {formatBytes(p.totalBytes)}
                      </td>

                      {/* 8. Last Handshake */}
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {p.isConnected ? (
                          <span className="text-emerald-700 font-sans font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Active Now
                          </span>
                        ) : p.lastHandshake ? (
                          <span title={new Date(p.lastHandshake).toLocaleString()}>
                            {formatRelativeTime(p.lastHandshake)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-sans">Never</span>
                        )}
                      </td>

                      {/* 9. Latest Active Endpoint */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {p.endpoint ? (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {p.endpoint}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* 10. Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const prof = initialProfiles.find((x) => x.id === p.id);
                            if (prof) onSelectProfile(prof);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded text-[11px] font-semibold border border-slate-300 shadow-xs transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
