import React, { useState } from 'react';
import {
  Server,
  Users,
  Radio,
  ArrowUpDown,
  UserPlus,
  Activity,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { StatCard } from '../ui/StatCard';
import { ServerStatus, VpnProfile, AuditLog, TrafficSnapshot } from '../../types';
import { formatBytes, formatRelativeTime } from '../../utils/formatters';

interface DashboardViewProps {
  serverStatus: ServerStatus | null;
  profiles: VpnProfile[];
  auditLogs: AuditLog[];
  trafficSnapshots: TrafficSnapshot[];
  onNavigate: (tab: any) => void;
  onNewProfile: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  serverStatus,
  profiles,
  auditLogs,
  trafficSnapshots,
  onNavigate,
  onNewProfile,
}) => {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');

  const activeConnectedCount = profiles.filter((p) => p.isConnected).length;
  const activeProfilesCount = profiles.filter((p) => p.status === 'active').length;

  const totalBytesReceived = profiles.reduce((sum, p) => sum + p.bytesReceived, 0);
  const totalBytesSent = profiles.reduce((sum, p) => sum + p.bytesSent, 0);
  const totalTraffic = totalBytesReceived + totalBytesSent;

  // Prepare chart data from snapshots or fallback
  const chartData = (trafficSnapshots.length > 0 ? trafficSnapshots : [
    { timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(), bytesReceived: 320000000, bytesSent: 85000000 },
    { timestamp: new Date(Date.now() - 16 * 3600 * 1000).toISOString(), bytesReceived: 580000000, bytesSent: 140000000 },
    { timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), bytesReceived: 890000000, bytesSent: 240000000 },
    { timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), bytesReceived: 1200000000, bytesSent: 350000000 },
    { timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), bytesReceived: 1540000000, bytesSent: 480000000 },
    { timestamp: new Date().toISOString(), bytesReceived: totalBytesReceived || 1850000000, bytesSent: totalBytesSent || 520000000 },
  ]).map((d) => {
    const rxMB = (d.bytesReceived / (1024 * 1024)).toFixed(1);
    const txMB = (d.bytesSent / (1024 * 1024)).toFixed(1);
    const totalMB = ((d.bytesReceived + d.bytesSent) / (1024 * 1024)).toFixed(1);

    const timeLabel = new Date(d.timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      time: timeLabel,
      receivedMB: parseFloat(rxMB),
      transmittedMB: parseFloat(txMB),
      totalMB: parseFloat(totalMB),
    };
  });

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Case Study Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                Case Study Institution
              </span>
              <span className="text-xs text-slate-500 font-medium">Akwa Ibom State, Nigeria</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              Foundation Polytechnic, Ikot Edem, Ikot Ekpene
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              WireGuard Campus VPN Gateway • Subnet: <code className="text-slate-800 font-mono font-medium">10.8.0.0/24</code> • Interface: <code className="text-slate-800 font-mono font-medium">{serverStatus?.interface || 'wg0'}</code> (UDP {serverStatus?.listeningPort || 51820})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            id="btn-dash-new-profile"
            onClick={onNewProfile}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Create Profile
          </button>
          <button
            id="btn-dash-view-traffic"
            onClick={() => onNavigate('traffic')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Activity className="w-4 h-4" />
            Audit Traffic
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          id="stat-vpn-server"
          title="VPN SERVER"
          value={serverStatus?.status ? serverStatus.status.toUpperCase() : 'ONLINE'}
          subtitle={serverStatus?.interface ? `Interface: ${serverStatus.interface}` : 'Port 51820 (UDP)'}
          icon={Server}
          badge={{
            text: serverStatus?.status === 'online' ? 'Online' : 'Active',
            variant: 'emerald',
          }}
        />

        <StatCard
          id="stat-active-clients"
          title="CONNECTED CLIENTS"
          value={activeConnectedCount}
          subtitle="Real-time WireGuard peers"
          icon={Radio}
          badge={{
            text: `${activeConnectedCount} Connected`,
            variant: activeConnectedCount > 0 ? 'emerald' : 'slate',
          }}
        />

        <StatCard
          id="stat-total-profiles"
          title="VPN PROFILES"
          value={profiles.length}
          subtitle={`${activeProfilesCount} active / ${profiles.length - activeProfilesCount} revoked`}
          icon={Users}
          badge={{
            text: `${activeProfilesCount} Active`,
            variant: 'blue',
          }}
        />

        <StatCard
          id="stat-total-traffic"
          title="TOTAL TRAFFIC"
          value={formatBytes(totalTraffic)}
          subtitle={`Rx: ${formatBytes(totalBytesReceived)} | Tx: ${formatBytes(totalBytesSent)}`}
          icon={ArrowUpDown}
          badge={{
            text: 'Audited',
            variant: 'blue',
          }}
        />

        <StatCard
          id="stat-connected"
          title="CONNECTION RATE"
          value={`${((activeConnectedCount / (profiles.length || 1)) * 100).toFixed(0)}%`}
          subtitle="Active peer utilization"
          icon={CheckCircle2}
          badge={{
            text: `${activeConnectedCount} of ${profiles.length}`,
            variant: 'emerald',
          }}
        />
      </div>

      {/* Charts and Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Traffic Overview Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                VPN Traffic Overview
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Network traffic transmitted and received by VPN clients
              </p>
            </div>

            {/* Timeframe Selector */}
            <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs">
              {(['24h', '7d', '30d'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    timeframe === t
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${val}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: '#FFFFFF',
                  }}
                  formatter={(val: any, name: any) => [
                    `${val} MB`,
                    name === 'receivedMB' ? 'Data Received (Rx)' : 'Data Transmitted (Tx)',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="receivedMB"
                  name="receivedMB"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRx)"
                />
                <Area
                  type="monotone"
                  dataKey="transmittedMB"
                  name="transmittedMB"
                  stroke="#0284C7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTx)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Data Received (Downlink)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
              <span>Data Transmitted (Uplink)</span>
            </div>
          </div>
        </div>

        {/* Recent Activity Column (1 Column) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Recent Audit Events
              </h4>
              <button
                onClick={() => onNavigate('audit-logs')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                View all
              </button>
            </div>

            <div className="space-y-2.5">
              {auditLogs.slice(0, 5).map((log) => {
                const getEventColor = () => {
                  switch (log.severity) {
                    case 'success':
                      return 'bg-green-50 text-green-700 border-green-200';
                    case 'warning':
                      return 'bg-amber-50 text-amber-700 border-amber-200';
                    case 'error':
                      return 'bg-red-50 text-red-700 border-red-200';
                    default:
                      return 'bg-blue-50 text-blue-700 border-blue-200';
                  }
                };

                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getEventColor()}`}>
                        {log.eventType.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatRelativeTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium leading-snug">
                      {log.profileName ? (
                        <span className="text-blue-600 font-semibold">{log.profileName}: </span>
                      ) : null}
                      {log.description}
                    </p>
                    {log.ipAddress && (
                      <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                        IP: {log.ipAddress}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Academic Privacy Compliance:</span>
                <p className="mt-0.5 text-slate-500 text-[11px] leading-relaxed">
                  Zero payload inspection. System audits packet metadata and connection timestamps only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
