import React, { useState } from 'react';
import {
  VpnProfile,
  ProfileStatus,
} from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { ProfileFormModal } from './ProfileFormModal';
import { ProfileDetailModal } from './ProfileDetailModal';
import { QrCodeModal } from './QrCodeModal';
import { formatBytes, formatRelativeTime, formatShortDate } from '../../utils/formatters';
import {
  Search,
  Filter,
  UserPlus,
  Eye,
  Edit2,
  Download,
  QrCode,
  ShieldAlert,
  Trash2,
  Users,
  CheckCircle2,
} from 'lucide-react';

interface ProfilesViewProps {
  profiles: VpnProfile[];
  onRefresh: () => void;
  onCreateProfile: (data: any) => Promise<void>;
  onUpdateProfile: (id: string, data: any) => Promise<void>;
  onRevokeProfile: (id: string) => Promise<void>;
  onActivateProfile: (id: string) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onDownloadConfig: (profile: VpnProfile) => void;
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
}

export const ProfilesView: React.FC<ProfilesViewProps> = ({
  profiles,
  onRefresh,
  onCreateProfile,
  onUpdateProfile,
  onRevokeProfile,
  onActivateProfile,
  onDeleteProfile,
  onDownloadConfig,
  isCreateOpen,
  setIsCreateOpen,
}) => {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [selectedProfile, setSelectedProfile] = useState<VpnProfile | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Destructive Confirmation Modals
  const [revokeTarget, setRevokeTarget] = useState<VpnProfile | null>(null);
  const [activateTarget, setActivateTarget] = useState<VpnProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VpnProfile | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Filter profiles
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.studentId.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.vpnIp.includes(search);

    const matchesDept =
      departmentFilter === 'all' || p.department.toLowerCase() === departmentFilter.toLowerCase();

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const departments = Array.from(new Set(profiles.map((p) => p.department)));

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    setIsProcessingAction(true);
    try {
      await onRevokeProfile(revokeTarget.id);
      setRevokeTarget(null);
      if (viewModalOpen && selectedProfile?.id === revokeTarget.id) {
        setViewModalOpen(false);
      }
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleActivateConfirm = async () => {
    if (!activateTarget) return;
    setIsProcessingAction(true);
    try {
      await onActivateProfile(activateTarget.id);
      setActivateTarget(null);
      if (viewModalOpen && selectedProfile?.id === activateTarget.id) {
        setViewModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to activate profile:', err);
      alert('An error occurred while activating the profile. Please check the console and ensure the server was restarted.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsProcessingAction(true);
    try {
      await onDeleteProfile(deleteTarget.id);
      setDeleteTarget(null);
      if (viewModalOpen && selectedProfile?.id === deleteTarget.id) {
        setViewModalOpen(false);
      }
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div id="profiles-view" className="space-y-5">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-profiles"
            type="text"
            placeholder="Search by name, student ID, department, or VPN IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              id="filter-department"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-slate-800 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="revoked">Revoked</option>
          </select>

          {/* New profile button */}
          <button
            id="btn-create-profile-top"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Profile</span>
          </button>
        </div>
      </div>

      {/* Profiles Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table id="table-vpn-profiles" className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Profile ID</th>
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Matric / Student ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">VPN IP</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Last Connection</th>
                <th className="py-3 px-4">Data Rx</th>
                <th className="py-3 px-4">Data Tx</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8">
                    <EmptyState
                      icon={Users}
                      title="No VPN profiles found"
                      description="No profiles match your search criteria or filter. Click below to provision a new WireGuard client."
                      action={{
                        label: 'Create New Profile',
                        onClick: () => setIsCreateOpen(true),
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => (
                  <tr
                    key={p.id}
                    id={`profile-row-${p.id}`}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {p.id}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{p.fullName}</span>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">
                        {p.email}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                      {p.studentId}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <span className="truncate max-w-[160px] block" title={p.department}>
                        {p.department}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                      {p.vpnIp}
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} />
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {formatShortDate(p.createdAt)}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {p.isConnected ? (
                        <span className="text-green-700 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                          Live Now
                        </span>
                      ) : (
                        formatRelativeTime(p.lastHandshake)
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {formatBytes(p.bytesReceived)}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {formatBytes(p.bytesSent)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View */}
                        <button
                          id={`btn-view-${p.id}`}
                          onClick={() => {
                            setSelectedProfile(p);
                            setViewModalOpen(true);
                          }}
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="View Profile Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          id={`btn-edit-${p.id}`}
                          onClick={() => {
                            setSelectedProfile(p);
                            setEditModalOpen(true);
                          }}
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Download Conf */}
                        <button
                          id={`btn-download-${p.id}`}
                          onClick={() => onDownloadConfig(p)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Download WireGuard .conf"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Show QR */}
                        <button
                          id={`btn-qr-${p.id}`}
                          onClick={() => {
                            setSelectedProfile(p);
                            setQrModalOpen(true);
                          }}
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Generate QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {/* Revoke */}
                        {p.status === 'active' && (
                          <button
                            id={`btn-revoke-${p.id}`}
                            onClick={() => setRevokeTarget(p)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            title="Revoke VPN Access"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Activate */}
                        {(p.status === 'revoked' || p.status === 'inactive') && (
                          <button
                            id={`btn-activate-${p.id}`}
                            onClick={() => setActivateTarget(p)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-green-700 hover:bg-green-50 transition-colors"
                            title="Activate VPN Access"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          id={`btn-delete-${p.id}`}
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                          title="Delete Profile Permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{filteredProfiles.length}</strong> of{' '}
            <strong className="text-slate-800">{profiles.length}</strong> profiles
          </span>
          <span className="text-[11px] text-slate-500">
            Foundation Polytechnic VPN Subnet: 10.8.0.0/24
          </span>
        </div>
      </div>

      {/* Create / Edit Form Modal */}
      <ProfileFormModal
        isOpen={isCreateOpen || editModalOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditModalOpen(false);
          setSelectedProfile(null);
        }}
        editProfile={editModalOpen ? selectedProfile : null}
        onSubmit={async (data) => {
          if (editModalOpen && selectedProfile) {
            await onUpdateProfile(selectedProfile.id, data);
          } else {
            await onCreateProfile(data);
          }
        }}
      />

      {/* Detailed Profile View Modal */}
      <ProfileDetailModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedProfile(null);
        }}
        profile={selectedProfile}
        onDownloadConfig={(p) => onDownloadConfig(p)}
        onShowQr={(p) => {
          setViewModalOpen(false);
          setSelectedProfile(p);
          setQrModalOpen(true);
        }}
        onRevoke={(p) => setRevokeTarget(p)}
        onActivate={(p) => setActivateTarget(p)}
        onEdit={(p) => {
          setViewModalOpen(false);
          setSelectedProfile(p);
          setEditModalOpen(true);
        }}
      />

      {/* QR Code Modal */}
      <QrCodeModal
        isOpen={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false);
          setSelectedProfile(null);
        }}
        profile={selectedProfile}
      />

      {/* Confirm Revoke Dialog */}
      <ConfirmDialog
        id="dialog-confirm-revoke"
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeConfirm}
        title="Revoke WireGuard Peer Access?"
        message={`Are you sure you want to revoke VPN access for ${revokeTarget?.fullName} (${revokeTarget?.studentId})? The public key will be immediately deregistered from the WireGuard interface wg0 and active tunnels will be severed.`}
        confirmLabel="Revoke Access"
        isDestructive={true}
        type="revoke"
        isLoading={isProcessingAction}
      />

      {/* Confirm Activate Dialog */}
      <ConfirmDialog
        id="dialog-confirm-activate"
        isOpen={!!activateTarget}
        onClose={() => setActivateTarget(null)}
        onConfirm={handleActivateConfirm}
        title="Activate WireGuard Peer Access?"
        message={`Are you sure you want to activate VPN access for ${activateTarget?.fullName} (${activateTarget?.studentId})? The public key will be registered with the WireGuard interface and their connection will be restored.`}
        confirmLabel="Activate Access"
        isDestructive={false}
        isLoading={isProcessingAction}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        id="dialog-confirm-delete"
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Permanently Delete VPN Profile?"
        message={`Are you sure you want to permanently delete the profile for ${deleteTarget?.fullName} (${deleteTarget?.studentId})? Assigned IP ${deleteTarget?.vpnIp} will be released back to the institutional pool.`}
        confirmLabel="Delete Permanently"
        isDestructive={true}
        type="delete"
        isLoading={isProcessingAction}
      />
    </div>
  );
};
