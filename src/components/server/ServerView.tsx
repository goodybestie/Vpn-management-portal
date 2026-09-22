import React, { useState } from 'react';
import { ServerStatus } from '../../types';
import { formatBytes } from '../../utils/formatters';
import { StatusBadge } from '../ui/StatusBadge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  Server,
  Play,
  Square,
  RotateCw,
  Key,
  Shield,
  Radio,
  ArrowDownLeft,
  ArrowUpRight,
  FileCode,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface ServerViewProps {
  serverStatus: ServerStatus | null;
  onStartServer: () => Promise<void>;
  onStopServer: () => Promise<void>;
  onRestartServer: () => Promise<void>;
  onRefresh: () => void;
}

export const ServerView: React.FC<ServerViewProps> = ({
  serverStatus,
  onStartServer,
  onStopServer,
  onRestartServer,
  onRefresh,
}) => {
  const [actionConfirm, setActionConfirm] = useState<'start' | 'stop' | 'restart' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleAction = async () => {
    if (!actionConfirm) return;
    setIsProcessing(true);
    setActionFeedback(null);

    try {
      if (actionConfirm === 'start') {
        await onStartServer();
        setActionFeedback({ success: true, message: 'WireGuard service started.' });
      } else if (actionConfirm === 'stop') {
        await onStopServer();
        setActionFeedback({ success: true, message: 'WireGuard interface stopped.' });
      } else if (actionConfirm === 'restart') {
        await onRestartServer();
        setActionFeedback({ success: true, message: 'WireGuard service restarted successfully.' });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setActionFeedback({ success: false, message: errMsg });
    } finally {
      setIsProcessing(false);
      setActionConfirm(null);
      onRefresh();
    }
  };

  const isOnline = serverStatus?.status === 'online';

  return (
    <div id="server-view" className="space-y-6">
      {/* Action feedback message */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-lg border flex items-start gap-3 text-xs ${
            actionFeedback.success
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {actionFeedback.success ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          )}
          <div>
            <p className="font-semibold">{actionFeedback.success ? 'Operation Completed' : 'Operation Notice'}</p>
            <p className="mt-0.5 leading-relaxed">{actionFeedback.message}</p>
          </div>
        </div>
      )}

      {/* Primary Server Status Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">WIREGUARD VPN SERVER</h3>
                <StatusBadge status={serverStatus?.status || 'online'} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Foundation Polytechnic Core Gateway • Interface: <span className="font-mono text-blue-600 font-semibold">{serverStatus?.interface || 'wg0'}</span>
              </p>
            </div>
          </div>

          {/* Service Controls (Start / Stop / Restart) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isOnline ? (
              <button
                id="btn-start-server"
                onClick={() => setActionConfirm('start')}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                Start Service
              </button>
            ) : (
              <button
                id="btn-stop-server"
                onClick={() => setActionConfirm('stop')}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                Stop Service
              </button>
            )}

            <button
              id="btn-restart-server"
              onClick={() => setActionConfirm('restart')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-500" />
              Restart Tunnel
            </button>
          </div>
        </div>

        {/* Server Technical Specifications Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              STATUS
            </span>
            <span className="text-base font-bold text-blue-600 mt-1 block">
              {serverStatus?.status?.toUpperCase() || 'ONLINE'}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Kernel Module Active</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              INTERFACE & DRIVER
            </span>
            <span className="text-base font-bold text-slate-900 mt-1 block font-mono">
              {serverStatus?.interface || 'wg0'}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Wintun / Windows Adapter</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              VPN ADDRESS / POOL
            </span>
            <span className="text-base font-bold text-blue-600 mt-1 block font-mono">
              {serverStatus?.vpnAddress || '10.8.0.1/24'}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Subnet 254 Host Capacity</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              LISTENING PORT (UDP)
            </span>
            <span className="text-base font-bold text-slate-900 mt-1 block font-mono">
              {serverStatus?.listeningPort || 51820}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Firewall Inbound Enabled</span>
          </div>
        </div>

        {/* Server Public Key Block */}
        <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-blue-600" />
              Server WireGuard Public Key (Dispatched to Clients)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Curve25519 (RFC 7748)</span>
          </div>
          <div className="p-2.5 bg-white rounded border border-slate-200 font-mono text-slate-800 text-xs break-all select-all shadow-xs">
            {serverStatus?.publicKey || 'Interface stopped or querying runtime key...'}
          </div>
        </div>

        {/* Metrics Row: Active Peers, Received Traffic, Transmitted Traffic */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                ACTIVE PEERS
              </span>
              <span className="text-xl font-bold text-blue-600 mt-0.5 block">
                {serverStatus?.activePeersCount ?? 0} Connected
              </span>
              <span className="text-[10px] text-slate-500">
                Of {serverStatus?.totalProfilesCount ?? 0} provisioned profiles
              </span>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 text-blue-600 rounded-lg shadow-xs">
              <Radio className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                RECEIVED TRAFFIC (RX)
              </span>
              <span className="text-xl font-bold text-blue-600 mt-0.5 block">
                {formatBytes(serverStatus?.bytesReceived ?? 0)}
              </span>
              <span className="text-[10px] text-slate-500">Total incoming packet payload</span>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 text-blue-600 rounded-lg shadow-xs">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                TRANSMITTED TRAFFIC (TX)
              </span>
              <span className="text-xl font-bold text-slate-800 mt-0.5 block">
                {formatBytes(serverStatus?.bytesSent ?? 0)}
              </span>
              <span className="text-[10px] text-slate-500">Total outgoing response payload</span>
            </div>
            <div className="p-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-xs">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Host Environment & Windows CLI Integration Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-600" />
            Host WireGuard Engine Integration
          </h4>
          <p className="text-slate-600 leading-relaxed">
            The server controller layer issues system-level process calls to the local WireGuard daemon:
          </p>
          <div className="space-y-2 font-mono text-[11px]">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500">Active Service Driver:</span>
              <p className="text-blue-600 font-semibold mt-0.5">{serverStatus?.platform || 'Windows WireGuard CLI'}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500">Windows CLI Path:</span>
              <p className="text-slate-800 mt-0.5 break-all">{serverStatus?.wireguardBinaryPath || 'C:\\Program Files\\WireGuard\\wg.exe'}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500">Configuration Path:</span>
              <p className="text-slate-800 mt-0.5 break-all">{serverStatus?.configPath || 'C:\\Program Files\\WireGuard\\Data\\Configurations\\wg0.conf'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileCode className="w-4 h-4 text-blue-600" />
            Live WireGuard wg0.conf Template
          </h4>
          <p className="text-slate-600 leading-relaxed">
            Active interface configuration running on the Foundation Polytechnic Windows host:
          </p>
          <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto select-all leading-relaxed">
{`# Foundation Polytechnic VPN Gateway Configuration
[Interface]
Address = ${serverStatus?.vpnAddress || '10.8.0.1/24'}
ListenPort = ${serverStatus?.listeningPort || 51820}
PrivateKey = <PROTECTED_SERVER_PRIVATE_KEY_ON_HOST>

# Peer configuration entries are added dynamically
# via Web Management Portal API`}
          </pre>
        </div>
      </div>

      {/* Confirmation Dialogs for Server Operations */}
      <ConfirmDialog
        isOpen={actionConfirm === 'start'}
        onClose={() => setActionConfirm(null)}
        onConfirm={handleAction}
        title="Start WireGuard VPN Service?"
        message="This will initialize the WireGuard tunnel interface wg0 on UDP port 51820 and allow incoming cryptographic connections from provisioned clients."
        confirmLabel="Start Service"
        isDestructive={false}
        type="warning"
        isLoading={isProcessing}
      />

      <ConfirmDialog
        isOpen={actionConfirm === 'stop'}
        onClose={() => setActionConfirm(null)}
        onConfirm={handleAction}
        title="Stop WireGuard VPN Service?"
        message="Warning: Stopping the WireGuard tunnel will immediately terminate all active student and faculty VPN sessions across the Foundation Polytechnic campus."
        confirmLabel="Stop Service"
        isDestructive={true}
        type="warning"
        isLoading={isProcessing}
      />

      <ConfirmDialog
        isOpen={actionConfirm === 'restart'}
        onClose={() => setActionConfirm(null)}
        onConfirm={handleAction}
        title="Restart WireGuard VPN Interface?"
        message="This will reload the WireGuard configuration file and re-synchronize the peer routing table. Brief interruption to connected peers will occur."
        confirmLabel="Restart Interface"
        isDestructive={false}
        type="warning"
        isLoading={isProcessing}
      />
    </div>
  );
};
