import React from 'react';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';
import { VpnProfile } from '../../types';
import { formatBytes, formatDateTime, formatRelativeTime } from '../../utils/formatters';
import {
  Download,
  QrCode,
  ShieldAlert,
  Edit,
  Key,
  Radio,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  User,
} from 'lucide-react';

interface ProfileDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: VpnProfile | null;
  onDownloadConfig: (profile: VpnProfile) => void;
  onShowQr: (profile: VpnProfile) => void;
  onRevoke: (profile: VpnProfile) => void;
  onActivate: (profile: VpnProfile) => void;
  onEdit: (profile: VpnProfile) => void;
}

export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({
  isOpen,
  onClose,
  profile,
  onDownloadConfig,
  onShowQr,
  onRevoke,
  onActivate,
  onEdit,
}) => {
  if (!profile) return null;

  const totalTraffic = profile.bytesReceived + profile.bytesSent;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="VPN Client Profile Details"
      subtitle={`Profile ID: ${profile.id} • Foundation Polytechnic`}
      maxWidth="xl"
    >
      <div className="space-y-5 text-xs">
        {/* Top summary card */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{profile.fullName}</h4>
              <p className="text-slate-500 font-mono text-[11px]">{profile.studentId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={profile.status} />
            {profile.isConnected ? (
              <StatusBadge status="connected" customLabel="Peer Online" />
            ) : (
              <StatusBadge status="disconnected" customLabel="Peer Offline" />
            )}
          </div>
        </div>

        {/* Section 1: PROFILE INFORMATION */}
        <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-xs">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-600" />
            Profile Information
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
            <div>
              <span className="text-[11px] text-slate-500 block">Name:</span>
              <span className="font-semibold text-slate-900">{profile.fullName}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Matric / Student ID:</span>
              <span className="font-semibold text-slate-900 font-mono">{profile.studentId}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Department:</span>
              <span className="font-semibold text-slate-900">{profile.department}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Email:</span>
              <span className="font-medium text-slate-900 truncate block">{profile.email}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Phone:</span>
              <span className="font-medium text-slate-900">{profile.phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Assigned VPN IP:</span>
              <span className="font-bold text-blue-600 font-mono text-xs">{profile.vpnIp}/32</span>
            </div>
          </div>
          {profile.description && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600">
              <span className="text-slate-400 font-medium">Purpose: </span>
              {profile.description}
            </div>
          )}
        </div>

        {/* Section 2: WIREGUARD INFORMATION */}
        <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-xs">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-blue-600" />
            WireGuard Cryptographic Parameters
          </h5>
          <div className="space-y-2.5">
            <div>
              <span className="text-[11px] text-slate-500 block mb-0.5">WireGuard Public Key:</span>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 break-all select-all">
                {profile.publicKey}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ArrowDownLeft className="w-3 h-3 text-blue-600" />
                  Data Received:
                </span>
                <span className="text-xs font-bold text-slate-900 mt-1 block">
                  {formatBytes(profile.bytesReceived)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-slate-400" />
                  Data Sent:
                </span>
                <span className="text-xs font-bold text-slate-900 mt-1 block">
                  {formatBytes(profile.bytesSent)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500">Total Traffic:</span>
                <span className="text-xs font-bold text-blue-600 mt-1 block">
                  {formatBytes(totalTraffic)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500">Handshake:</span>
                <span className="text-xs font-bold text-slate-800 mt-1 block">
                  {formatRelativeTime(profile.lastHandshake)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: CONNECTION STATUS */}
        <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-xs">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-600" />
            Connection Session Auditing
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[11px] text-slate-500 block">Connection State:</span>
              <span className="font-semibold text-slate-800">
                {profile.isConnected ? 'Active Tunnel Connected' : 'Inactive / Standby'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Last Seen / Handshake:</span>
              <span className="font-semibold text-slate-800">
                {formatDateTime(profile.lastHandshake)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Client Endpoint:</span>
              <span className="font-mono text-slate-700">
                {profile.endpoint || 'No active remote endpoint'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <button
              id="btn-modal-download-conf"
              onClick={() => onDownloadConfig(profile)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download .conf
            </button>
            <button
              id="btn-modal-show-qr"
              onClick={() => onShowQr(profile)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-600" />
              Show QR Code
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-modal-edit-profile"
              onClick={() => onEdit(profile)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Profile
            </button>
            {profile.status === 'active' && (
              <button
                id="btn-modal-revoke-profile"
                onClick={() => onRevoke(profile)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Revoke Access
              </button>
            )}
            {(profile.status === 'revoked' || profile.status === 'inactive') && (
              <button
                id="btn-modal-activate-profile"
                onClick={() => onActivate(profile)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Activate Access
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
