import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProfilesView } from './components/profiles/ProfilesView';
import { ClientsView } from './components/clients/ClientsView';
import { TrafficView } from './components/traffic/TrafficView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { ServerView } from './components/server/ServerView';
import { SettingsView } from './components/settings/SettingsView';
import { LoginView } from './components/auth/LoginView';
import { LoadingState } from './components/ui/LoadingState';
import { ErrorState } from './components/ui/ErrorState';
import { ProfileDetailModal } from './components/profiles/ProfileDetailModal';
import { QrCodeModal } from './components/profiles/QrCodeModal';

import {
  VpnProfile,
  ServerStatus,
  AuditLog,
  TrafficSnapshot,
  AdminUserSafe,
} from './types';
import {
  fetchServerStatus,
  fetchProfiles,
  fetchAuditLogs,
  fetchTrafficData,
  createProfile,
  updateProfile,
  revokeProfile,
  deleteProfile,
  startVpnServer,
  stopVpnServer,
  restartVpnServer,
  getCurrentAdmin,
  logoutAdmin,
  fetchProfileConfig,
} from './api/client';

export default function App() {
  // Administrator authentication state
  const [currentAdmin, setCurrentAdmin] = useState<AdminUserSafe | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);

  // Core telemetry state
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [profiles, setProfiles] = useState<VpnProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [snapshots, setSnapshots] = useState<TrafficSnapshot[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateProfileOpen, setIsCreateProfileOpen] = useState(false);

  // Global modals for inspecting a profile from any screen
  const [inspectedProfile, setInspectedProfile] = useState<VpnProfile | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleTabChange = (tab: NavTab) => {
    setCurrentTab(tab);
    window.history.pushState(null, '', `/${tab}`);
  };

  // Check initial authentication session
  useEffect(() => {
    const verifySession = async () => {
      try {
        const authData = await getCurrentAdmin();
        if (authData.authenticated && authData.admin) {
          setCurrentAdmin(authData.admin);
          const path = window.location.pathname.replace(/^\//, '');
          const validTabs: NavTab[] = [
            'dashboard',
            'profiles',
            'clients',
            'traffic',
            'audit-logs',
            'server',
            'settings',
          ];
          if (validTabs.includes(path as NavTab)) {
            setCurrentTab(path as NavTab);
          } else {
            window.history.replaceState(null, '', '/dashboard');
            setCurrentTab('dashboard');
          }
        } else {
          setCurrentAdmin(null);
          window.history.replaceState(null, '', '/auth/login');
        }
      } catch {
        setCurrentAdmin(null);
        window.history.replaceState(null, '', '/auth/login');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    verifySession();
  }, []);

  // Listen to browser navigation back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '');
      const validTabs: NavTab[] = [
        'dashboard',
        'profiles',
        'clients',
        'traffic',
        'audit-logs',
        'server',
        'settings',
      ];
      if (validTabs.includes(path as NavTab)) {
        setCurrentTab(path as NavTab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Main data fetching function
  const loadAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const [statusRes, profilesRes, auditRes, trafficRes] = await Promise.all([
        fetchServerStatus().catch((e) => {
          if (e?.message?.includes('401') || e?.message?.includes('Unauthorized')) {
            throw e;
          }
          return null;
        }),
        fetchProfiles().catch((e) => {
          if (e?.message?.includes('401') || e?.message?.includes('Unauthorized')) {
            throw e;
          }
          return [];
        }),
        fetchAuditLogs().catch((e) => {
          if (e?.message?.includes('401') || e?.message?.includes('Unauthorized')) {
            throw e;
          }
          return [];
        }),
        fetchTrafficData().catch((e) => {
          if (e?.message?.includes('401') || e?.message?.includes('Unauthorized')) {
            throw e;
          }
          return null;
        }),
      ]);

      if (statusRes) setServerStatus(statusRes);
      setProfiles(profilesRes);
      setAuditLogs(auditRes);
      if (trafficRes?.historySnapshots) {
        setSnapshots(trafficRes.historySnapshots);
      }
      setError(null);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Error communicating with WireGuard service';
      if (errMsg.includes('401') || errMsg.includes('Unauthorized')) {
        setCurrentAdmin(null);
        window.history.replaceState(null, '', '/auth/login');
        showToast('Session expired. Please sign in again.');
      } else {
        setError(errMsg);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Periodic heartbeat polling (every 6 seconds) ONLY when authenticated
  useEffect(() => {
    if (!currentAdmin) return;
    loadAllData(false);
    const interval = setInterval(() => {
      loadAllData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [currentAdmin, loadAllData]);

  // Handle Login success
  const handleLoginSuccess = (admin: AdminUserSafe) => {
    setCurrentAdmin(admin);
    window.history.replaceState(null, '', '/dashboard');
    setCurrentTab('dashboard');
    showToast(`Authenticated as ${admin.name} (${admin.email})`);
    loadAllData(false);
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentAdmin(null);
    window.history.replaceState(null, '', '/auth/login');
    showToast('Administrator signed out successfully');
  };

  // Download .conf file safely using client-side Blob to prevent AI Studio cookie check
  const handleDownloadConfig = async (profile: VpnProfile) => {
    try {
      showToast(`Generating WireGuard configuration for ${profile.fullName}...`);
      const { confContent, filename } = await fetchProfileConfig(profile.id);

      const cleanFilename = filename || `FoundationPoly_VPN_${profile.studentId.replace(/[^a-zA-Z0-9]/g, '_')}.conf`;
      const blob = new Blob([confContent], { type: 'text/plain;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', cleanFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      showToast(`Downloaded configuration for ${profile.fullName}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download configuration';
      showToast(msg);
    }
  };

  // Profile operations
  const handleCreateProfile = async (data: any) => {
    const result = await createProfile(data);
    showToast(`Successfully created profile for ${result.profile.fullName}`);
    await loadAllData(true);
  };

  const handleUpdateProfile = async (id: string, data: any) => {
    const updated = await updateProfile(id, data);
    showToast(`Updated profile for ${updated.fullName}`);
    await loadAllData(true);
  };

  const handleRevokeProfile = async (id: string) => {
    await revokeProfile(id);
    showToast('VPN profile access revoked from WireGuard interface');
    await loadAllData(true);
  };

  const handleDeleteProfile = async (id: string) => {
    await deleteProfile(id);
    showToast('VPN profile removed and IP released');
    await loadAllData(true);
  };

  // Server operations
  const handleStartServer = async () => {
    const res = await startVpnServer();
    showToast(res.message);
    await loadAllData(true);
  };

  const handleStopServer = async () => {
    const res = await stopVpnServer();
    showToast(res.message);
    await loadAllData(true);
  };

  const handleRestartServer = async () => {
    const res = await restartVpnServer();
    showToast(res.message);
    await loadAllData(true);
  };

  // 1. Loading state while verifying administrator session
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-700">Foundation Polytechnic VPN Portal</p>
        <p className="text-[11px] text-slate-400 mt-1">Verifying administrator session...</p>
      </div>
    );
  }

  // 2. Unauthenticated: Render Administrator Login Screen
  if (!currentAdmin) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl border border-slate-800 flex items-center gap-2 transition-all">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl border border-slate-800 flex items-center gap-2 transition-all">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        serverStatus={serverStatus}
        isOpenMobile={isOpenMobileSidebar}
        onCloseMobile={() => setIsOpenMobileSidebar(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 bg-[#F8FAFC]">
        <Header
          currentTab={currentTab}
          serverStatus={serverStatus}
          currentAdmin={currentAdmin}
          onOpenMobileSidebar={() => setIsOpenMobileSidebar(true)}
          onRefresh={() => loadAllData(false)}
          onNewProfile={() => {
            handleTabChange('profiles');
            setIsCreateProfileOpen(true);
          }}
          onLogout={handleLogout}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {isLoading ? (
            <LoadingState message="Connecting to Foundation Polytechnic WireGuard Gateway..." />
          ) : error && profiles.length === 0 ? (
            <ErrorState
              title="Connection Error"
              message={error}
              onRetry={() => loadAllData(false)}
            />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  serverStatus={serverStatus}
                  profiles={profiles}
                  auditLogs={auditLogs}
                  trafficSnapshots={snapshots}
                  onNavigate={handleTabChange}
                  onNewProfile={() => {
                    handleTabChange('profiles');
                    setIsCreateProfileOpen(true);
                  }}
                />
              )}

              {currentTab === 'profiles' && (
                <ProfilesView
                  profiles={profiles}
                  onRefresh={() => loadAllData(false)}
                  onCreateProfile={handleCreateProfile}
                  onUpdateProfile={handleUpdateProfile}
                  onRevokeProfile={handleRevokeProfile}
                  onDeleteProfile={handleDeleteProfile}
                  onDownloadConfig={handleDownloadConfig}
                  isCreateOpen={isCreateProfileOpen}
                  setIsCreateOpen={setIsCreateProfileOpen}
                />
              )}

              {currentTab === 'clients' && (
                <ClientsView
                  profiles={profiles}
                  onRefresh={() => loadAllData(false)}
                  onSelectProfile={(p) => setInspectedProfile(p)}
                />
              )}

              {currentTab === 'traffic' && (
                <TrafficView
                  profiles={profiles}
                  snapshots={snapshots}
                  onRefresh={() => loadAllData(false)}
                  onSelectProfile={(p) => setInspectedProfile(p)}
                />
              )}

              {currentTab === 'audit-logs' && (
                <AuditLogsView
                  auditLogs={auditLogs}
                  onRefresh={() => loadAllData(false)}
                />
              )}

              {currentTab === 'server' && (
                <ServerView
                  serverStatus={serverStatus}
                  onStartServer={handleStartServer}
                  onStopServer={handleStopServer}
                  onRestartServer={handleRestartServer}
                  onRefresh={() => loadAllData(false)}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsView
                  serverStatus={serverStatus}
                  onRefresh={() => loadAllData(false)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Profile Details Modal */}
      <ProfileDetailModal
        isOpen={!!inspectedProfile}
        onClose={() => setInspectedProfile(null)}
        profile={inspectedProfile}
        onDownloadConfig={(p) => handleDownloadConfig(p)}
        onShowQr={(p) => {
          setIsQrModalOpen(true);
        }}
        onRevoke={(p) => {
          handleRevokeProfile(p.id);
          setInspectedProfile(null);
        }}
        onEdit={(p) => {
          setInspectedProfile(null);
          handleTabChange('profiles');
        }}
      />

      {/* Global QR Code Modal */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        profile={inspectedProfile}
      />
    </div>
  );
}
