import React from 'react';
import { ProfileStatus } from '../../types';

interface StatusBadgeProps {
  id?: string;
  status:
    | ProfileStatus
    | 'connected'
    | 'disconnected'
    | 'online'
    | 'offline'
    | 'degraded'
    | 'never_connected'
    | 'peer_not_found'
    | string;
  customLabel?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ id, status, customLabel }) => {
  const normStatus = String(status).toLowerCase().replace(/[\s_-]+/g, '_');

  const getStyles = () => {
    switch (normStatus) {
      case 'active':
      case 'connected':
      case 'online':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-600',
          label: customLabel || (normStatus === 'connected' ? 'CONNECTED' : normStatus === 'online' ? 'ONLINE' : 'ACTIVE'),
        };
      case 'revoked':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          dot: 'bg-red-600',
          label: customLabel || 'REVOKED',
        };
      case 'inactive':
      case 'disconnected':
      case 'offline':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
          label: customLabel || (normStatus === 'disconnected' ? 'DISCONNECTED' : 'OFFLINE'),
        };
      case 'never_connected':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          label: customLabel || 'NEVER CONNECTED',
        };
      case 'peer_not_found':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          label: customLabel || 'PEER NOT FOUND',
        };
      case 'degraded':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-600',
          label: customLabel || 'DEGRADED',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
          label: customLabel || String(status).toUpperCase(),
        };
    }
  };

  const { bg, dot, label } = getStyles();

  return (
    <span
      id={id}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
    </span>
  );
};
