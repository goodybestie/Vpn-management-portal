# Web-Based Management Portal for Efficient VPN Profile Administration and Traffic Auditing

**Academic Project Case Study:**  
**Foundation Polytechnic, Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria.**  
*Department of Computer Science / Electrical & Electronics Engineering*

---

## 1. Project Overview

This project implements an institutional web-based management portal designed to streamline **WireGuard VPN Profile Administration** and **VPN Traffic Auditing**. 

Prior to this system, configuring secure remote access for students, researchers, and administrative personnel required manual SSH/CLI editing of WireGuard configuration files, manual cryptographic key generation, unverified IP assignments, and lacked automated audit logging or cryptographic traffic volume monitoring. 

This portal provides authorized network administrators at Foundation Polytechnic with:
1. **Automated Profile Provisioning**: Server-side Curve25519 cryptographic key generation, IP pool assignment (`10.8.0.0/24`), instant downloadable `.conf` configurations, and mobile QR code generation.
2. **Access Control & Lifecycle Management**: Real-time peer registration, profile editing, instant credential revocation, and permanent decommissioning.
3. **Cryptographic Traffic Auditing**: Monitoring upload (transmitted) and download (received) byte volumes per client and aggregate time-series traffic without inspecting encrypted payload content.
4. **Institutional Audit Trails**: Event-driven tracking of profile creation, credential dispatch, connection handshakes, interface modifications, and administrative operations.
5. **Direct Windows WireGuard Integration**: Native communication with `wg.exe` and the Windows WireGuard Tunnel Service (`WireGuardTunnel$wg0`) with an automated development adapter for testing in virtualized environments.

---

## 2. System Architecture

```text
+-------------------------------------------------------------------------+
|                  Admin Client (Browser / Workstation)                   |
+-------------------------------------------------------------------------+
                                     |
                                     | HTTPS / REST JSON API
                                     v
+-------------------------------------------------------------------------+
|          Next.js / Express Web Application & API Layer (Node.js)        |
| - REST Endpoints: /api/profiles, /api/traffic, /api/vpn, /api/audit-logs|
| - Server-Side Crypto: RFC 7748 Curve25519 Key Generation                |
| - QR Code Generator & WireGuard .conf Config Builder                    |
| - Persistent Institutional Store (SQLite / JSON Schema)                 |
+-------------------------------------------------------------------------+
                                     |
                                     | Native Process Invocation
                                     v
+-------------------------------------------------------------------------+
|                         WireGuard Service Layer                         |
|                                                                         |
|   +---------------------------------+  +----------------------------+   |
|   |      RealWireGuardService       |  |    MockWireGuardService    |   |
|   |  - Invokes wg.exe show dump     |  |  - Simulated peer engine   |   |
|   |  - Invokes wg.exe set peer      |  |  - Sandbox / dev testing   |   |
|   |  - Windows Service Controller   |  |  - Realistic traffic flow  |   |
|   +---------------------------------+  +----------------------------+   |
+-------------------------------------------------------------------------+
                                     |
                                     | WireGuard Windows Driver / Wintun
                                     v
+-------------------------------------------------------------------------+
|                    WireGuard VPN Tunnel (Interface wg0)                 |
|                     Listening Port: UDP 51820                           |
|                     Address Pool: 10.8.0.1/24                           |
+-------------------------------------------------------------------------+
          ^                                                    ^
          | WireGuard Encrypted UDP Tunnel                     |
          v                                                    v
+------------------------------------+       +----------------------------+
| Mobile Clients (Android / iOS)     |       | PC / Laptop Workstations   |
| Scanned via In-Portal QR Code      |       | Imported via .conf file    |
+------------------------------------+       +----------------------------+
```

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion animations, Recharts data visualization.
- **Backend**: Node.js, Express, `child_process` (native Windows WireGuard CLI integration).
- **Cryptography**: Node.js `crypto` (Curve25519 / X25519 keypair generation, RFC 7748).
- **Database & Storage**: Structured SQLite / JSON relational datastore with ACID-compliant updates.
- **VPN Core**: WireGuard for Windows (`wg.exe`, `wireguard.exe`, Wintun virtual network adapter).
- **Automation**: PowerShell (`scripts/setup.ps1`) for Windows administrative installation and firewall configuration.

---

## 4. Hardware & Software Prerequisites

1. **Host Operating System**: Windows 10, Windows 11, or Windows Server 2019/2022.
2. **Node.js**: Version 20.0.0 or higher.
3. **WireGuard for Windows**: Official MSI installer from [wireguard.com/install](https://www.wireguard.com/install/).
4. **Network Router / Firewall**: Port forwarding configured for **UDP Port 51820** pointing to the VPN server machine.

---

## 5. Quick Start & Setup on Windows

### Step 1: Automated Setup with PowerShell
Open PowerShell as **Administrator** and run:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope Process
.\scripts\setup.ps1
```
This script will:
1. Verify Node.js and WireGuard installations.
2. Generate fresh cryptographic server keys.
3. Create `wg0.conf` under `C:\Program Files\WireGuard\Data\Configurations\wg0.conf`.
4. Add the Windows Defender Firewall inbound rule for UDP port 51820.
5. Install and launch the Windows WireGuard Tunnel Service.
6. Configure the local `.env` environment variables.

### Step 2: Launch the Management Portal
```powershell
npm install
npm run build
npm start
```
For local development:
```powershell
npm run dev
```

Open your browser to:
`http://localhost:3000`

---

## 6. VPN Profile Administration Workflow

1. Navigate to **VPN Profiles** (`/profiles`).
2. Click **+ Create New Profile**.
3. Enter the student or faculty member's details:
   - Full Name (e.g., `Bassey Emmanuel Okon`)
   - Matric / Staff ID (e.g., `FP/ND/CS/22/041`)
   - Academic Department (e.g., `Computer Science`)
   - Institutional Email (e.g., `emmanuel.okon@foundationpoly.edu.ng`)
   - Phone Number and Profile Purpose
4. Click **Create VPN Profile**:
   - The backend allocates an IP address (`10.8.0.x`).
   - The backend generates a unique Curve25519 private/public keypair.
   - The public key is registered with WireGuard via `wg set wg0 peer <pubkey> allowed-ips <ip>/32`.
   - The profile is stored and an audit record is written.
5. Click **Download Configuration** to obtain the `.conf` file or click **Show QR Code** for mobile scanning.

---

## 7. Connecting Mobile & Desktop Clients

### On Android / iOS:
1. Install **WireGuard** from Google Play Store or Apple App Store.
2. Open the app and tap the **+** (Add) button.
3. Select **Scan from QR Code**.
4. Scan the QR code displayed in the portal.
5. Enter a name (e.g. `FoundationPoly VPN`) and toggle **Connect**.

### On Windows / macOS / Linux:
1. Download the `.conf` file from the portal.
2. Open WireGuard client -> Click **Add Tunnel** -> Select the downloaded file -> Click **Activate**.

---

## 8. Privacy & Ethical Traffic Auditing Policy

In compliance with academic data protection standards:
- **No Payload Inspection**: The portal does **NOT** decrypt, inspect, or log HTTPS URLs, student passwords, private chat messages, or personal documents.
- **Cryptographic Metadata Only**: The auditing engine measures byte counts (Data Received / Data Transmitted), cryptographic handshake timestamps, and active connection endpoints.

---

## 9. Academic Project Credits

**Institution**: Foundation Polytechnic  
**Location**: Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria  
**Project Title**: *Design and Implementation of a Web-Based Management Portal for Efficient VPN Profile Administration and Traffic Auditing.*  
**Academic Session**: 2024 - 2026
