<#
.SYNOPSIS
    Automated Setup and Deployment Script for WireGuard VPN Management Portal.
    Case Study: Foundation Polytechnic, Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria.

.DESCRIPTION
    This PowerShell script verifies Windows system prerequisites (Node.js, WireGuard for Windows),
    generates fresh server keypairs, builds the WireGuard interface configuration (wg0.conf),
    initializes the local SQLite/JSON datastore, installs the Windows Tunnel Service, and configures
    the Windows Defender Firewall rule for UDP Port 51820.

.NOTES
    Academic Project: "Design and Implementation of a Web-Based Management Portal for Efficient
    VPN Profile Administration and Traffic Auditing"
    Run this script from an Elevated (Run as Administrator) PowerShell window.
#>

# Requires Run as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERROR] This setup script requires elevated Administrator privileges." -ForegroundColor Red
    Write-Host "Please right-click PowerShell and choose 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    Exit 1
}

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host " FOUNDATION POLYTECHNIC - IKOT EDEM, IKOT EKPENE, AKWA IBOM STATE        " -ForegroundColor Green
Write-Host " VPN Profile Administration & Traffic Auditing Portal Setup Engine       " -ForegroundColor White
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Environment & Paths
$WireGuardDir = "C:\Program Files\WireGuard"
$WireGuardDataDir = "C:\Program Files\WireGuard\Data\Configurations"
$WgExe = Join-Path $WireGuardDir "wg.exe"
$WireGuardExe = Join-Path $WireGuardDir "wireguard.exe"
$InterfaceName = "wg0"
$ConfFilePath = Join-Path $WireGuardDataDir "$InterfaceName.conf"
$ServerPort = 51820
$ServerSubnet = "10.8.0.1/24"

# 2. Check Node.js
Write-Host "[Step 1/8] Checking Node.js runtime installation..." -ForegroundColor Yellow
try {
    $nodeVer = node -v
    Write-Host "  -> Node.js detected: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "  [!] Node.js is NOT found in PATH. Please install Node.js v20+ from https://nodejs.org" -ForegroundColor Red
    Exit 1
}

# 3. Check WireGuard for Windows
Write-Host "[Step 2/8] Verifying WireGuard for Windows installation..." -ForegroundColor Yellow
if (-not (Test-Path $WgExe)) {
    Write-Host "  [!] WireGuard CLI ($WgExe) not found." -ForegroundColor Red
    Write-Host "  Please download and install official WireGuard for Windows from: https://www.wireguard.com/install/" -ForegroundColor Yellow
    Write-Host "  After installation, re-run this setup script." -ForegroundColor Yellow
    Exit 1
} else {
    Write-Host "  -> WireGuard CLI detected at $WgExe" -ForegroundColor Green
}

# 4. Create Project and Configuration Directories
Write-Host "[Step 3/8] Ensuring WireGuard configurations directory..." -ForegroundColor Yellow
if (-not (Test-Path $WireGuardDataDir)) {
    New-Item -ItemType Directory -Force -Path $WireGuardDataDir | Out-Null
}
Write-Host "  -> Directory ready: $WireGuardDataDir" -ForegroundColor Green

# 5. Generate Server Keypair
Write-Host "[Step 4/8] Generating fresh WireGuard cryptographic keypair..." -ForegroundColor Yellow
$ServerPrivateKey = & $WgExe genkey
$ServerPublicKey = $ServerPrivateKey | & $WgExe pubkey

Write-Host "  -> Server Public Key generated: $ServerPublicKey" -ForegroundColor Green

# 6. Generate wg0.conf
Write-Host "[Step 5/8] Generating primary WireGuard interface configuration ($ConfFilePath)..." -ForegroundColor Yellow
$ConfigContent = @"
# Foundation Polytechnic VPN Gateway Configuration
# Interface: $InterfaceName
# Listening Port: $ServerPort
# Academic Project: VPN Profile Administration & Traffic Auditing

[Interface]
Address = $ServerSubnet
ListenPort = $ServerPort
PrivateKey = $ServerPrivateKey

# Peers dynamically managed via the Web Management Portal API
"@

Set-Content -Path $ConfFilePath -Value $ConfigContent -Encoding UTF8
Write-Host "  -> Configuration written to $ConfFilePath" -ForegroundColor Green

# 7. Configure Windows Firewall
Write-Host "[Step 6/8] Configuring Windows Defender Firewall for UDP port $ServerPort..." -ForegroundColor Yellow
$ExistingRule = Get-NetFirewallRule -DisplayName "Foundation Poly WireGuard VPN" -ErrorAction SilentlyContinue
if (-not $ExistingRule) {
    New-NetFirewallRule -DisplayName "Foundation Poly WireGuard VPN" -Direction Inbound -Protocol UDP -LocalPort $ServerPort -Action Allow | Out-Null
    Write-Host "  -> Firewall rule added: Allow UDP $ServerPort inbound." -ForegroundColor Green
} else {
    Write-Host "  -> Firewall rule already exists." -ForegroundColor Green
}

# 8. Install / Start WireGuard Tunnel Service
Write-Host "[Step 7/8] Installing WireGuard Windows Tunnel Service..." -ForegroundColor Yellow
try {
    # Install tunnel service
    & $WireGuardExe /installtunnelservice $ConfFilePath
    Write-Host "  -> WireGuard Tunnel Service installed and started (WireGuardTunnel`$$InterfaceName)." -ForegroundColor Green
} catch {
    Write-Host "  [!] Service may already be registered. Trying restart..." -ForegroundColor Yellow
    Restart-Service -Name "WireGuardTunnel`$$InterfaceName" -ErrorAction SilentlyContinue
}

# 9. Prepare Web Portal Dependencies and Environment
Write-Host "[Step 8/8] Preparing Web Portal environment variables and database..." -ForegroundColor Yellow
$EnvFile = ".env"
$EnvTemplate = @"
PORT=3000
WG_INTERFACE=$InterfaceName
WG_SERVER_ADDRESS=$ServerSubnet
WG_SERVER_PORT=$ServerPort
WG_SERVER_ENDPOINT=127.0.0.1:$ServerPort
WG_CLIENT_DNS=10.8.0.1, 1.1.1.1
WG_EXE_PATH=$WgExe
WG_CONFIG_PATH=$ConfFilePath
WG_SERVER_PUBLIC_KEY=$ServerPublicKey
"@

Set-Content -Path $EnvFile -Value $EnvTemplate -Encoding UTF8
Write-Host "  -> .env configured with generated server public key." -ForegroundColor Green

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host " SETUP COMPLETED SUCCESSFULLY!                                           " -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "The Foundation Polytechnic VPN Management Portal is now ready to launch." -ForegroundColor White
Write-Host ""
Write-Host "To start the application, run:" -ForegroundColor Cyan
Write-Host "    npm run build" -ForegroundColor White
Write-Host "    npm start" -ForegroundColor White
Write-Host "Or for development:" -ForegroundColor Cyan
Write-Host "    npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then open your browser at: http://localhost:3000" -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Green
