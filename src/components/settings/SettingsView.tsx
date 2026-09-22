import React, { useState } from 'react';
import { ServerStatus } from '../../types';
import {
  Settings,
  Terminal,
  Download,
  Copy,
  Check,
  Building,
  GraduationCap,
  ShieldCheck,
  Cpu,
  RefreshCw,
  FileCode,
  Globe,
} from 'lucide-react';

interface SettingsViewProps {
  serverStatus: ServerStatus | null;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ serverStatus, onRefresh }) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [endpointHost, setEndpointHost] = useState(serverStatus?.endpoint || 'vpn.foundationpoly.edu.ng');
  const [savedSettings, setSavedSettings] = useState(false);

  const powershellScript = `# =========================================================================
# FOUNDATION POLYTECHNIC, IKOT EDEM, IKOT EKPENE, AKWA IBOM STATE, NIGERIA
# Academic Project: Web-Based Management Portal for VPN Administration & Traffic Auditing
# Windows Server / Host Automated WireGuard Setup Script
# =========================================================================

Write-Host "Starting Foundation Polytechnic WireGuard Setup..." -ForegroundColor Cyan

# 1. Verify Windows Administrator Privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "CRITICAL: This script must be executed in an elevated PowerShell console as Administrator."
    exit 1
}

# 2. Check or Install WireGuard for Windows
$wgPath = "C:\\Program Files\\WireGuard\\wg.exe"
if (-not (Test-Path $wgPath)) {
    Write-Host "WireGuard not detected. Downloading official WireGuard Windows installer..." -ForegroundColor Yellow
    $installer = "$env:TEMP\\wireguard-installer.exe"
    Invoke-WebRequest -Uri "https://download.wireguard.com/windows-client/wireguard-installer.exe" -OutFile $installer
    Start-Process -FilePath $installer -ArgumentList "/install" -Wait
}

# 3. Configure Windows Inbound Firewall Rule for UDP Port 51820
Write-Host "Configuring Windows Advanced Firewall for UDP 51820..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "Foundation Poly WireGuard VPN (UDP 51820)" \`
    -Direction Inbound -LocalPort 51820 -Protocol UDP -Action Allow -ErrorAction SilentlyContinue

# 4. Enable IPv4 Packet Forwarding on Windows Host
Write-Host "Enabling IPv4 Routing on host..." -ForegroundColor Yellow
Set-NetIPInterface -Forwarding Enabled

Write-Host "WireGuard Server Environment Ready for Management Portal Bridge!" -ForegroundColor Green
`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(powershellScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([powershellScript], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'FoundationPoly_WireGuard_Setup.ps1';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="settings-view" className="space-y-6">
      {/* Institutional Academic Project Details */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Academic Project Specification
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                ND / HND Project Case Study
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Design and Implementation of a Web-Based Management Portal for Efficient VPN Profile Administration and Traffic Auditing
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              <strong>Institution:</strong> Foundation Polytechnic, Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria.
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              <strong>Architecture:</strong> Node.js / Express Web Application communicating with local Windows WireGuard daemon via <code className="text-slate-800 font-mono">wg.exe</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Network Configuration Settings */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600" />
          Gateway & Network Configuration
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 mb-1 font-semibold">
              Public VPN Endpoint Host / Domain
            </label>
            <input
              type="text"
              value={endpointHost}
              onChange={(e) => {
                setEndpointHost(e.target.value);
                setSavedSettings(false);
              }}
              placeholder="e.g. vpn.foundationpoly.edu.ng or 197.210.x.x"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Used in generated client <code className="text-slate-700">.conf</code> files as the remote Endpoint.
            </p>
          </div>

          <div>
            <label className="block text-slate-700 mb-1 font-semibold">
              WireGuard Port & Subnet Pool
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                disabled
                value="51820 (UDP)"
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono"
              />
              <input
                type="text"
                disabled
                value="10.8.0.0/24"
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Subnet capacity: 254 static peer allocations (10.8.0.2 to 10.8.0.254).
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs">
          <span className="text-[11px] text-slate-500">
            {savedSettings ? '✓ Gateway parameters updated.' : 'Changes apply to newly generated profile configurations.'}
          </span>
          <button
            onClick={() => setSavedSettings(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
          >
            Save Gateway Settings
          </button>
        </div>
      </div>

      {/* Windows Host Deployment Automation (PowerShell) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-600" />
              Windows WireGuard Host Automation (setup.ps1)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Run this script on the Windows computer hosting the WireGuard daemon before starting the portal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-copy-ps1"
              onClick={handleCopyScript}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              {copiedScript ? 'Copied Script' : 'Copy Script'}
            </button>
            <button
              id="btn-download-ps1"
              onClick={handleDownloadScript}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download setup.ps1
            </button>
          </div>
        </div>

        <pre className="p-3.5 bg-slate-900 rounded-lg border border-slate-800 text-slate-200 font-mono text-[11px] max-h-56 overflow-y-auto select-all leading-relaxed">
          {powershellScript}
        </pre>
      </div>
    </div>
  );
};
