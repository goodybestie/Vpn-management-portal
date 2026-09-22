import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { VpnProfile } from '../../types';
import { KeyRound, Shield, AlertCircle } from 'lucide-react';

interface ProfileFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    fullName: string;
    studentId: string;
    department: string;
    email: string;
    phone?: string;
    description?: string;
  }) => Promise<void>;
  editProfile?: VpnProfile | null;
  isLoading?: boolean;
}

export const ProfileFormModal: React.FC<ProfileFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editProfile,
  isLoading = false,
}) => {
  const [fullName, setFullName] = useState(editProfile?.fullName || '');
  const [studentId, setStudentId] = useState(editProfile?.studentId || '');
  const [department, setDepartment] = useState(editProfile?.department || 'Computer Science');
  const [email, setEmail] = useState(editProfile?.email || '');
  const [phone, setPhone] = useState(editProfile?.phone || '');
  const [description, setDescription] = useState(editProfile?.description || '');
  const [error, setError] = useState<string | null>(null);

  // Sync state if editing
  React.useEffect(() => {
    if (editProfile) {
      setFullName(editProfile.fullName);
      setStudentId(editProfile.studentId);
      setDepartment(editProfile.department);
      setEmail(editProfile.email);
      setPhone(editProfile.phone || '');
      setDescription(editProfile.description || '');
    } else {
      setFullName('');
      setStudentId('');
      setDepartment('Computer Science');
      setEmail('');
      setPhone('');
      setDescription('Institutional Academic & Lab VPN Access');
    }
    setError(null);
  }, [editProfile, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !studentId.trim() || !email.trim()) {
      setError('Please fill in all required fields (Full Name, Student ID, Email).');
      return;
    }

    try {
      await onSubmit({
        fullName: fullName.trim(),
        studentId: studentId.trim(),
        department: department.trim(),
        email: email.trim(),
        phone: phone.trim(),
        description: description.trim(),
      });
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
    }
  };

  const departments = [
    'Computer Science',
    'Electrical / Electronic Engineering',
    'Science Laboratory Technology',
    'Accountancy',
    'Business Administration & Management',
    'Statistics',
    'ICT & Academic Computing Directorate',
    'Bursary & Financial Operations',
    'Registry & Academic Affairs',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editProfile ? 'Edit VPN Profile' : 'Create WireGuard VPN Profile'}
      subtitle="Foundation Polytechnic — Ikot Edem, Ikot Ekpene Campus Network"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              id="input-fullname"
              type="text"
              required
              placeholder="e.g. Bassey Emmanuel Okon"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Matric / Student / Staff ID *
            </label>
            <input
              id="input-studentid"
              type="text"
              required
              disabled={!!editProfile}
              placeholder="e.g. FP/ND/CS/22/041"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Academic Department *
            </label>
            <select
              id="select-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institutional Email *
            </label>
            <input
              id="input-email"
              type="email"
              required
              placeholder="e.g. student@foundationpoly.edu.ng"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              id="input-phone"
              type="tel"
              placeholder="+234 800 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Profile Purpose / Description
            </label>
            <input
              id="input-description"
              type="text"
              placeholder="e.g. Final Year Project Lab Access"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>

        {!editProfile && (
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-blue-600 font-semibold">
              <Shield className="w-4 h-4" />
              <span>Automated Cryptographic Provisioning</span>
            </div>
            <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
              <li>Next available static IP automatically assigned from subnet <code className="text-slate-800 font-mono">10.8.0.0/24</code></li>
              <li>Curve25519 keypair generated server-side using secure OS entropy</li>
              <li>Peer registered dynamically to WireGuard daemon on port <code className="text-slate-800 font-mono">51820</code></li>
              <li>Instant `.conf` configuration and mobile QR code prepared for download</li>
            </ul>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-submit-profile-form"
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating Keys & IP...
              </>
            ) : editProfile ? (
              'Update Profile'
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                Provision VPN Profile
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
