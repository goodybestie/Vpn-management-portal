import React from 'react';
import {
  LayoutDashboard,
  Users,
  MonitorSmartphone,
  Activity,
  FileClock,
  Server,
  Settings,
  Shield,
  GraduationCap,
} from 'lucide-react';
import { ServerStatus } from '../../types';

export type NavTab =
  | 'dashboard'
  | 'profiles'
  | 'clients'
  | 'traffic'
  | 'audit-logs'
  | 'server'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  serverStatus: ServerStatus | null;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavSection {
  title?: string;
  items: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  serverStatus,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navSections: NavSection[] = [
    {
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'VPN MANAGEMENT',
      items: [
        {
          id: 'profiles',
          label: 'VPN Profiles',
          icon: Users,
          badge: serverStatus?.totalProfilesCount !== undefined ? String(serverStatus.totalProfilesCount) : undefined,
        },
        {
          id: 'clients',
          label: 'Connected Clients',
          icon: MonitorSmartphone,
          badge: serverStatus?.activePeersCount !== undefined ? String(serverStatus.activePeersCount) : undefined,
        },
      ],
    },
    {
      title: 'MONITORING',
      items: [
        {
          id: 'traffic',
          label: 'Traffic Monitoring',
          icon: Activity,
        },
        {
          id: 'audit-logs',
          label: 'Audit Logs',
          icon: FileClock,
        },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        {
          id: 'server',
          label: 'VPN Server',
          icon: Server,
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-[#0F172A] border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header & Branding Section */}
        <div>
          <div className="p-5 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white tracking-tight leading-tight truncate">
                  Foundation Polytechnic
                </h1>
                <p className="text-[11px] font-medium text-slate-400 leading-tight truncate mt-0.5">
                  VPN Management Portal
                </p>
              </div>
            </div>

            <div className="mt-3.5 px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div className="truncate">
                <p className="font-medium text-slate-300 truncate">Ikot Edem, Ikot Ekpene</p>
                <p className="text-[10px] text-slate-400 truncate">Akwa Ibom State, Nigeria</p>
              </div>
            </div>
          </div>

          {/* Grouped Navigation Links */}
          <nav className="p-3.5 space-y-4">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                {section.title && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </div>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`nav-${item.id}`}
                      onClick={() => {
                        onTabChange(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        <span className="text-left">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isActive
                              ? 'bg-blue-700/80 text-white'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom WireGuard Server Status Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/50">
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-slate-400">WireGuard Service</span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {serverStatus?.status?.toUpperCase() || 'ONLINE'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {serverStatus?.interface ? `Interface: ${serverStatus.interface} (UDP ${serverStatus.listeningPort || 51820})` : 'wg0: UDP 51820'}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
              Subnet: 10.8.0.0/24
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
