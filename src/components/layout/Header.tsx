import React, { useState, useRef, useEffect } from 'react';
import { Menu, RefreshCw, UserPlus, Cpu, ShieldCheck, LogOut, ChevronDown, User } from 'lucide-react';
import { NavTab } from './Sidebar';
import { ServerStatus, AdminUserSafe } from '../../types';

interface HeaderProps {
  currentTab: NavTab;
  serverStatus: ServerStatus | null;
  currentAdmin?: AdminUserSafe | null;
  onOpenMobileSidebar: () => void;
  onRefresh: () => void;
  onNewProfile: () => void;
  onLogout?: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  serverStatus,
  currentAdmin,
  onOpenMobileSidebar,
  onRefresh,
  onNewProfile,
  onLogout,
  isRefreshing,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Monitor VPN activity and system performance',
    },
    profiles: {
      title: 'VPN Profiles',
      subtitle: 'Manage and administer institutional VPN access profiles',
    },
    clients: {
      title: 'Connected Clients',
      subtitle: 'Currently connected WireGuard peers, handshake status, and live sessions',
    },
    traffic: {
      title: 'Traffic Monitoring',
      subtitle: 'Network traffic transmitted and received by VPN clients',
    },
    'audit-logs': {
      title: 'Audit Logs',
      subtitle: 'System security audit trail and administrative operations log',
    },
    server: {
      title: 'VPN Server',
      subtitle: 'Interface parameters, public keys, and daemon service controls',
    },
    settings: {
      title: 'Settings',
      subtitle: 'System settings, host automation scripts, and network parameters',
    },
  };

  const { title, subtitle } = titles[currentTab] || {
    title: 'VPN Management Portal',
    subtitle: 'Foundation Polytechnic, Ikot Ekpene',
  };

  const isOnline = serverStatus?.status === 'online';

  const getInitials = (name?: string) => {
    if (!name) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs"
    >
      <div className="flex items-center gap-3">
        <button
          id="btn-open-mobile-sidebar"
          onClick={onOpenMobileSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {title}
          </h2>
          <p className="hidden sm:block text-xs text-slate-500 leading-none mt-1">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* VPN Server Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-600' : 'bg-red-600'}`} />
          <span className="font-medium hidden sm:inline">
            VPN Server {isOnline ? 'Online' : 'Offline'}
          </span>
          <span className="font-medium sm:hidden">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Backend mode indicator (Desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
          {serverStatus?.isWindows ? (
            <>
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>Windows WireGuard</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>WireGuard Engine</span>
            </>
          )}
        </div>

        {/* Refresh button */}
        <button
          id="btn-refresh-telemetry"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50"
          title="Refresh VPN statistics"
          aria-label="Refresh VPN statistics"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        {/* Quick Add Profile button */}
        <button
          id="btn-quick-new-profile"
          onClick={onNewProfile}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Create Profile</span>
        </button>

        {/* Admin profile chip & Dropdown */}
        <div className="relative pl-2 border-l border-slate-200" ref={dropdownRef}>
          <button
            id="btn-admin-profile-menu"
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
              {getInitials(currentAdmin?.name)}
            </div>
            <div className="hidden xl:block text-left text-xs leading-none">
              <p className="font-semibold text-slate-900">
                {currentAdmin?.name || 'Administrator'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {currentAdmin?.role || 'ADMIN'} &bull; ICT Directorate
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div
              id="admin-dropdown-menu"
              className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-900/10 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">
                  {currentAdmin?.name || 'System Administrator'}
                </p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {currentAdmin?.email || 'admin@foundationpoly.edu.ng'}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {currentAdmin?.role || 'ADMIN'}
                  </span>
                  <span className="text-[10px] text-slate-400">Foundation Polytechnic</span>
                </div>
              </div>

              <div className="py-1">
                <div className="px-4 py-1.5 text-[11px] text-slate-500 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Session: Active (HTTP-only)</span>
                </div>
              </div>

              {onLogout && (
                <div className="pt-1 border-t border-slate-100">
                  <button
                    id="btn-admin-logout"
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
