import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import {
  IWireGuardService,
  WireGuardInterfaceStatus,
  WireGuardPeerInfo,
  ServiceOperationResult,
} from './IWireGuardService';

const execFileAsync = promisify(execFile);

export class RealWireGuardService implements IWireGuardService {
  readonly serviceName = 'Real Windows WireGuard Service';
  readonly isSimulation = false;

  private defaultBinaryPaths = [
    process.env.WG_EXE_PATH || '',
    'C:\\Program Files\\WireGuard\\wg.exe',
    'C:\\Program Files (x86)\\WireGuard\\wg.exe',
    'wg.exe',
    '/usr/bin/wg',
    'wg',
  ].filter(Boolean);

  private resolvedBinary: string | null = null;
  private interfaceName = process.env.WG_INTERFACE || 'wg0';

  /**
   * Locate the executable path
   */
  async getExecutablePath(): Promise<string> {
    if (this.resolvedBinary) {
      return this.resolvedBinary;
    }

    for (const testPath of this.defaultBinaryPaths) {
      try {
        if (fs.existsSync(testPath)) {
          this.resolvedBinary = testPath;
          return testPath;
        }
      } catch {
        // Continue searching
      }
    }

    // Try executing directly
    try {
      await execFileAsync('wg', ['--version']);
      this.resolvedBinary = 'wg';
      return 'wg';
    } catch {
      // Not found
    }

    throw new Error('WireGuard executable (wg.exe) was not found in standard paths.');
  }

  async checkInstallation(): Promise<{
    installed: boolean;
    path: string;
    version?: string;
    details: string;
  }> {
    try {
      const bin = await this.getExecutablePath();
      const { stdout } = await execFileAsync(bin, ['--version']).catch(() => ({
        stdout: 'WireGuard CLI detected',
      }));

      return {
        installed: true,
        path: bin,
        version: stdout.trim(),
        details: 'WireGuard Windows CLI detected and reachable.',
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        installed: false,
        path: 'Not found',
        details: `WireGuard binary missing or not accessible: ${errMsg}`,
      };
    }
  }

  /**
   * Parse `wg show <interface> dump`
   * Line 1: private_key public_key listen_port fwmark
   * Peer lines: public_key preshared_key endpoint allowed_ips latest_handshake transfer_rx transfer_tx persistent_keepalive
   */
  async getInterfaceStatus(iface = this.interfaceName): Promise<WireGuardInterfaceStatus> {
    const bin = await this.getExecutablePath();
    const sanitizedIface = iface.replace(/[^a-zA-Z0-9_-]/g, '');

    try {
      const { stdout } = await execFileAsync(bin, ['show', sanitizedIface, 'dump']);
      const lines = stdout.trim().split('\n');

      if (lines.length === 0 || !lines[0]) {
        return {
          interface: sanitizedIface,
          publicKey: '',
          listeningPort: 51820,
          peers: {},
          isOnline: false,
          totalRx: 0,
          totalTx: 0,
        };
      }

      // Interface line
      const ifaceParts = lines[0].trim().split('\t');
      const serverPubKey = ifaceParts[1] || '';
      const listenPort = parseInt(ifaceParts[2] || '51820', 10);

      const peers: Record<string, WireGuardPeerInfo> = {};
      let totalRx = 0;
      let totalTx = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split('\t');
        if (parts.length >= 8) {
          const pubKey = parts[0];
          const endpoint = parts[2] === '(none)' ? undefined : parts[2];
          const allowedIps = (parts[3] || '').split(',').map((s) => s.trim());
          const latestHandshake = parseInt(parts[4] || '0', 10);
          const rx = parseInt(parts[5] || '0', 10);
          const tx = parseInt(parts[6] || '0', 10);
          const keepalive = parseInt(parts[7] || '0', 10);

          totalRx += rx;
          totalTx += tx;

          peers[pubKey] = {
            publicKey: pubKey,
            endpoint,
            allowedIps,
            latestHandshake,
            transferRx: rx,
            transferTx: tx,
            persistentKeepalive: keepalive,
          };
        }
      }

      return {
        interface: sanitizedIface,
        publicKey: serverPubKey,
        listeningPort: listenPort,
        peers,
        isOnline: true,
        totalRx,
        totalTx,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        interface: sanitizedIface,
        publicKey: '',
        listeningPort: 51820,
        peers: {},
        isOnline: false,
        totalRx: 0,
        totalTx: 0,
      };
    }
  }

  async addPeer(params: {
    interfaceName?: string;
    publicKey: string;
    allowedIp: string;
  }): Promise<ServiceOperationResult> {
    const bin = await this.getExecutablePath();
    const iface = (params.interfaceName || this.interfaceName).replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanPubKey = params.publicKey.trim();
    const cleanIp = params.allowedIp.trim().replace(/\/32$/, '');

    // Validate IP format to prevent arbitrary command injection
    if (!/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanIp) && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanIp)) {
      return {
        success: false,
        message: 'Invalid IP address syntax provided.',
      };
    }

    try {
      await execFileAsync(bin, [
        'set',
        iface,
        'peer',
        cleanPubKey,
        'allowed-ips',
        `${cleanIp}/32`,
      ]);

      return {
        success: true,
        message: `Peer ${cleanPubKey.substring(0, 10)}... registered to ${iface} with IP ${cleanIp}/32.`,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isPerm = errMsg.toLowerCase().includes('access is denied') || errMsg.toLowerCase().includes('operation not permitted');
      return {
        success: false,
        requiresAdmin: isPerm,
        message: isPerm
          ? 'Administrator privileges required to execute WireGuard commands on Windows. Run server as Administrator.'
          : `Failed to add peer to WireGuard: ${errMsg}`,
        details: errMsg,
      };
    }
  }

  async removePeer(publicKey: string, iface = this.interfaceName): Promise<ServiceOperationResult> {
    const bin = await this.getExecutablePath();
    const sanitizedIface = iface.replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanPubKey = publicKey.trim();

    try {
      await execFileAsync(bin, ['set', sanitizedIface, 'peer', cleanPubKey, 'remove']);
      return {
        success: true,
        message: `Peer revoked and removed from live interface ${sanitizedIface}.`,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Failed to remove peer: ${errMsg}`,
        details: errMsg,
      };
    }
  }

  async startService(iface = this.interfaceName): Promise<ServiceOperationResult> {
    const serviceName = `WireGuardTunnel$${iface}`;
    try {
      // On Windows: sc.exe start WireGuardTunnel$<iface>
      await execFileAsync('sc.exe', ['start', serviceName]);
      return {
        success: true,
        message: `Service ${serviceName} started successfully.`,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const requiresAdmin = errMsg.toLowerCase().includes('access is denied') || errMsg.toLowerCase().includes('5');
      return {
        success: false,
        requiresAdmin,
        message: requiresAdmin
          ? 'Elevated Administrator permissions required to start Windows WireGuard Service.'
          : `Could not start Windows WireGuard service: ${errMsg}`,
        details: errMsg,
      };
    }
  }

  async stopService(iface = this.interfaceName): Promise<ServiceOperationResult> {
    const serviceName = `WireGuardTunnel$${iface}`;
    try {
      await execFileAsync('sc.exe', ['stop', serviceName]);
      return {
        success: true,
        message: `Service ${serviceName} stopped.`,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Could not stop Windows WireGuard service: ${errMsg}`,
        details: errMsg,
      };
    }
  }

  async restartService(iface = this.interfaceName): Promise<ServiceOperationResult> {
    await this.stopService(iface);
    // Give 1 second delay
    await new Promise((r) => setTimeout(r, 1000));
    return this.startService(iface);
  }
}
