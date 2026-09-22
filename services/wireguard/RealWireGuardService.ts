/**
 * Foundation Polytechnic VPN Management Portal
 * Real WireGuard Service Implementation
 * Interacts directly with local Windows WireGuard CLI (wg.exe) and Windows Services
 */

import { execFile } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
import {
  IWireGuardService,
  WireGuardServerStatus,
  WireGuardInterface,
  WireGuardPeer,
  WireGuardInterfaceStatus,
  AddPeerOptions,
  PeerStats,
} from './WireGuardService';
import { isValidWireGuardPublicKey } from '../../server/services/crypto';

const execFileAsync = promisify(execFile);

export class RealWireGuardService implements IWireGuardService {
  readonly serviceName = 'Real Windows WireGuard Service';
  readonly isSimulation = false;

  private resolvedBinaryPath: string | null = null;

  // Configurable parameters via environment variables
  private get interfaceName(): string {
    return (process.env.WG_INTERFACE || 'MyVPN-Server').trim();
  }

  private get serverAddress(): string {
    return (process.env.WG_SERVER_ADDRESS || '10.8.0.1').trim();
  }

  private get serverPort(): number {
    const parsed = parseInt(process.env.WG_SERVER_PORT || '63196', 10);
    return isNaN(parsed) || parsed <= 0 ? 63196 : parsed;
  }

  private get serverEndpoint(): string {
    return (process.env.WG_SERVER_ENDPOINT || '192.168.1.181:63196').trim();
  }

  private get clientDns(): string {
    return (process.env.WG_CLIENT_DNS || '1.1.1.1').trim();
  }

  /**
   * Sanitizes interface names to prevent command injection
   */
  private sanitizeInterface(name?: string): string {
    const target = (name || this.interfaceName).trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(target)) {
      throw new Error(`Invalid WireGuard interface name: "${target}". Only alphanumeric, hyphen, and underscore characters are allowed.`);
    }
    return target;
  }

  /**
   * Validates standard Base64 Curve25519 44-character public keys
   */
  private validatePublicKey(key: string): string {
    const trimmed = key.trim();
    if (!/^[A-Za-z0-9+/]{43}=$/.test(trimmed)) {
      throw new Error('Invalid WireGuard public key format. Must be a 44-character Base64 string ending in =.');
    }
    return trimmed;
  }

  /**
   * Validates IPv4 / CIDR syntax
   */
  private validateIpAddress(ip: string): string {
    const trimmed = ip.trim();
    const clean = trimmed.includes('/') ? trimmed : `${trimmed}/32`;
    if (!/^(\d{1,3}\.){3}\d{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/.test(trimmed)) {
      throw new Error(`Invalid IPv4 address syntax: "${trimmed}".`);
    }
    return clean;
  }

  /**
   * Resolves the real WireGuard binary path
   */
  async getExecutablePath(): Promise<string> {
    if (this.resolvedBinaryPath) {
      return this.resolvedBinaryPath;
    }

    const candidatePaths = [
      process.env.WG_EXE_PATH,
      'C:\\Program Files\\WireGuard\\wg.exe',
      'C:\\Program Files (x86)\\WireGuard\\wg.exe',
      'wg.exe',
      '/usr/bin/wg',
      '/usr/local/bin/wg',
      'wg',
    ].filter(Boolean) as string[];

    for (const testPath of candidatePaths) {
      try {
        if (fs.existsSync(testPath)) {
          this.resolvedBinaryPath = testPath;
          return testPath;
        }
      } catch {
        // Continue searching
      }
    }

    // Try checking if wg is reachable in system PATH via --version
    try {
      await execFileAsync('wg', ['--version'], { timeout: 2000 });
      this.resolvedBinaryPath = 'wg';
      return 'wg';
    } catch {
      // Not on PATH
    }

    throw new Error(
      `WireGuard CLI executable was not found. Looked at: ${process.env.WG_EXE_PATH || 'C:\\Program Files\\WireGuard\\wg.exe'}. Please ensure WireGuard for Windows is installed.`
    );
  }

  /**
   * Checks if WireGuard is installed and executable on this machine
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.getExecutablePath();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Executes WireGuard CLI safely with structured arguments
   */
  private async runWgCommand(args: string[]): Promise<string> {
    const bin = await this.getExecutablePath();
    let stdout = '';
    let stderr = '';

    try {
      const result = await execFileAsync(bin, args, {
        windowsHide: true,
        timeout: 10000,
      });
      stdout = result.stdout || '';
      stderr = result.stderr || '';
    } catch (execErr: any) {
      const errStdout = execErr?.stdout ? String(execErr.stdout).trim() : '';
      const errStderr = execErr?.stderr ? String(execErr.stderr).trim() : '';
      const exitCode = execErr?.code !== undefined ? ` (exit code ${execErr.code})` : '';
      const details = errStderr || errStdout || execErr?.message || 'Unknown execution failure';
      throw new Error(`WireGuard CLI command "${args[0] || ''}" failed${exitCode}: ${details}`);
    }

    if (stderr && stderr.trim().length > 0) {
      // If stderr contains error messages from wg.exe, treat as a failure
      throw new Error(`WireGuard CLI Error: ${stderr.trim()}`);
    }

    return stdout;
  }

  /**
   * Parses the machine-readable output of `wg show <interface> dump`
   * Line 1: <private-key>\t<public-key>\t<listen-port>\t<fwmark>
   * Subsequent lines: <peer-pubkey>\t<preshared-key>\t<endpoint>\t<allowed-ips>\t<latest-handshake>\t<transfer-rx>\t<transfer-tx>\t<persistent-keepalive>
   *
   * SECURITY: The interface private key on line 1 is discarded immediately and never returned.
   */
  private parseDumpOutput(stdout: string, ifaceName: string): { iface: WireGuardInterface | null; peers: WireGuardPeer[] } {
    const lines = stdout.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      return { iface: null, peers: [] };
    }

    // Interface Header Line
    const ifaceParts = lines[0].split('\t');
    // ifaceParts[0] is private-key -> DISCARD IMMEDIATELY
    const publicKey = ifaceParts[1] || '';
    const listeningPort = parseInt(ifaceParts[2] || `${this.serverPort}`, 10) || this.serverPort;
    const fwmark = ifaceParts[3] && ifaceParts[3] !== 'off' ? ifaceParts[3] : undefined;

    const iface: WireGuardInterface = {
      name: ifaceName,
      publicKey,
      listeningPort,
      fwmark,
    };

    const peers: WireGuardPeer[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      if (parts.length >= 8) {
        const peerPubKey = parts[0];
        // parts[1] is preshared-key -> do not expose
        const rawEndpoint = parts[2];
        const endpoint = rawEndpoint && rawEndpoint !== '(none)' ? rawEndpoint : undefined;
        const allowedIPs = (parts[3] || '')
          .split(',')
          .map((ip) => ip.trim())
          .filter(Boolean);
        const latestHandshake = parseInt(parts[4] || '0', 10) || 0;
        const transferRx = parseInt(parts[5] || '0', 10) || 0;
        const transferTx = parseInt(parts[6] || '0', 10) || 0;
        const keepaliveRaw = parseInt(parts[7] || '0', 10);
        const persistentKeepalive = !isNaN(keepaliveRaw) && keepaliveRaw > 0 ? keepaliveRaw : undefined;

        peers.push({
          publicKey: peerPubKey,
          allowedIPs,
          endpoint,
          latestHandshake,
          transferRx,
          transferTx,
          persistentKeepalive,
        });
      }
    }

    return { iface, peers };
  }

  /**
   * Fallback parser for standard `wg show <interface>` text output
   */
  private parseStandardOutput(stdout: string, ifaceName: string): { iface: WireGuardInterface | null; peers: WireGuardPeer[] } {
    const lines = stdout.split(/\r?\n/);
    let publicKey = '';
    let listeningPort = this.serverPort;

    const peers: WireGuardPeer[] = [];
    let currentPeer: Partial<WireGuardPeer> | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith('public key:')) {
        const key = line.replace('public key:', '').trim();
        if (!publicKey) {
          publicKey = key;
        }
      } else if (line.startsWith('listening port:')) {
        const portStr = line.replace('listening port:', '').trim();
        listeningPort = parseInt(portStr, 10) || this.serverPort;
      } else if (line.startsWith('peer:')) {
        if (currentPeer && currentPeer.publicKey) {
          peers.push(currentPeer as WireGuardPeer);
        }
        const pKey = line.replace('peer:', '').trim();
        currentPeer = {
          publicKey: pKey,
          allowedIPs: [],
          latestHandshake: 0,
          transferRx: 0,
          transferTx: 0,
        };
      } else if (currentPeer) {
        if (line.startsWith('endpoint:')) {
          currentPeer.endpoint = line.replace('endpoint:', '').trim();
        } else if (line.startsWith('allowed ips:')) {
          currentPeer.allowedIPs = line
            .replace('allowed ips:', '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (line.startsWith('latest handshake:')) {
          // Approximate relative string or parse
          currentPeer.latestHandshake = Math.floor(Date.now() / 1000);
        } else if (line.startsWith('transfer:')) {
          // transfer: 1.42 GiB received, 389.12 MiB sent
          // Parsing fallback numbers
        }
      }
    }

    if (currentPeer && currentPeer.publicKey) {
      peers.push(currentPeer as WireGuardPeer);
    }

    const iface: WireGuardInterface = {
      name: ifaceName,
      publicKey,
      listeningPort,
    };

    return { iface, peers };
  }

  /**
   * Fetch live interface details and peers from wg.exe
   */
  private async fetchRuntimeState(): Promise<{ iface: WireGuardInterface | null; peers: WireGuardPeer[]; isRunning: boolean }> {
    const ifaceName = this.sanitizeInterface();

    try {
      // First attempt machine-readable dump format
      const dumpOutput = await this.runWgCommand(['show', ifaceName, 'dump']);
      const parsed = this.parseDumpOutput(dumpOutput, ifaceName);
      return {
        iface: parsed.iface,
        peers: parsed.peers,
        isRunning: parsed.iface !== null,
      };
    } catch (dumpErr) {
      // Attempt standard text format as secondary
      try {
        const textOutput = await this.runWgCommand(['show', ifaceName]);
        const parsed = this.parseStandardOutput(textOutput, ifaceName);
        return {
          iface: parsed.iface,
          peers: parsed.peers,
          isRunning: parsed.iface !== null,
        };
      } catch (err: unknown) {
        return {
          iface: null,
          peers: [],
          isRunning: false,
        };
      }
    }
  }

  // =========================================================================
  // IWireGuardService API Implementation
  // =========================================================================

  /**
   * Dynamically retrieves the actual server public key from the running WireGuard interface or environment.
   * Strictly validates that the key decodes to exactly 32 bytes (44-character Base64).
   * Does NOT expose private keys and never hardcodes fake values.
   */
  async getServerPublicKey(interfaceName?: string): Promise<string | null> {
    const ifaceName = this.sanitizeInterface(interfaceName);

    // 1. Try dedicated WireGuard CLI subcommand: `wg show <interface> public-key`
    try {
      const output = await this.runWgCommand(['show', ifaceName, 'public-key']);
      const key = output.trim();
      if (isValidWireGuardPublicKey(key)) {
        return key;
      }
    } catch {
      // Continue to next extraction method
    }

    // 2. Try parsing runtime dump: `wg show <interface> dump`
    try {
      const dumpOutput = await this.runWgCommand(['show', ifaceName, 'dump']);
      const parsed = this.parseDumpOutput(dumpOutput, ifaceName);
      if (parsed.iface?.publicKey && isValidWireGuardPublicKey(parsed.iface.publicKey)) {
        return parsed.iface.publicKey;
      }
    } catch {
      // Continue
    }

    // 3. Try standard `wg show <interface>` text output
    try {
      const textOutput = await this.runWgCommand(['show', ifaceName]);
      const parsed = this.parseStandardOutput(textOutput, ifaceName);
      if (parsed.iface?.publicKey && isValidWireGuardPublicKey(parsed.iface.publicKey)) {
        return parsed.iface.publicKey;
      }
    } catch {
      // Continue
    }

    // 4. Check if WG_SERVER_PUBLIC_KEY is configured in the environment
    const envKey = process.env.WG_SERVER_PUBLIC_KEY?.trim();
    if (envKey && isValidWireGuardPublicKey(envKey)) {
      return envKey;
    }

    return null;
  }

  async getServerStatus(): Promise<WireGuardServerStatus> {
    const ifaceName = this.sanitizeInterface();
    const address = this.serverAddress;
    const configuredPort = this.serverPort;

    try {
      const isInstalled = await this.isAvailable();
      const fallbackPubKey = (await this.getServerPublicKey(ifaceName)) || '';

      if (!isInstalled) {
        return {
          interface: ifaceName,
          address,
          port: configuredPort,
          publicKey: fallbackPubKey,
          status: 'UNAVAILABLE',
          peerCount: 0,
          details: `WireGuard executable was not found at configured path (${process.env.WG_EXE_PATH || 'C:\\Program Files\\WireGuard\\wg.exe'}).`,
          isWindows: process.platform === 'win32',
          serviceName: this.serviceName,
          isSimulation: false,
          endpoint: this.serverEndpoint,
          dns: this.clientDns,
        };
      }

      const { iface, peers, isRunning } = await this.fetchRuntimeState();

      if (!isRunning || !iface) {
        return {
          interface: ifaceName,
          address,
          port: configuredPort,
          publicKey: fallbackPubKey,
          status: 'STOPPED',
          peerCount: 0,
          details: `WireGuard interface "${ifaceName}" is currently not running or stopped.`,
          isWindows: process.platform === 'win32',
          serviceName: this.serviceName,
          isSimulation: false,
          endpoint: this.serverEndpoint,
          dns: this.clientDns,
        };
      }

      const now = Math.floor(Date.now() / 1000);
      const activePeers = peers.filter(
        (p) => p.latestHandshake > 0 && now - p.latestHandshake < 180
      ).length;

      let totalRx = 0;
      let totalTx = 0;
      for (const p of peers) {
        totalRx += p.transferRx;
        totalTx += p.transferTx;
      }

      const verifiedPublicKey = (iface.publicKey && isValidWireGuardPublicKey(iface.publicKey))
        ? iface.publicKey
        : fallbackPubKey;

      return {
        interface: iface.name,
        address,
        port: iface.listeningPort || configuredPort,
        publicKey: verifiedPublicKey,
        status: 'RUNNING',
        peerCount: peers.length,
        activePeersCount: activePeers,
        bytesReceived: totalRx,
        bytesSent: totalTx,
        endpoint: this.serverEndpoint,
        dns: this.clientDns,
        isWindows: process.platform === 'win32',
        serviceName: this.serviceName,
        isSimulation: false,
        details: 'WireGuard server is active and processing live network tunnels.',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        interface: ifaceName,
        address,
        port: configuredPort,
        publicKey: '',
        status: 'ERROR',
        peerCount: 0,
        details: `Failed to inspect WireGuard interface: ${message}`,
        isWindows: process.platform === 'win32',
        serviceName: this.serviceName,
        isSimulation: false,
      };
    }
  }

  async getInterfaceStatus(interfaceName?: string): Promise<WireGuardInterfaceStatus> {
    const ifaceName = this.sanitizeInterface(interfaceName);
    const { iface, peers, isRunning } = await this.fetchRuntimeState();
    const peerMap: Record<string, WireGuardPeer> = {};
    let totalRx = 0;
    let totalTx = 0;

    for (const p of peers) {
      peerMap[p.publicKey] = p;
      totalRx += p.transferRx;
      totalTx += p.transferTx;
    }

    return {
      interface: ifaceName,
      publicKey: iface?.publicKey || '',
      listeningPort: iface?.listeningPort || this.serverPort,
      peers: peerMap,
      isOnline: isRunning,
      totalRx,
      totalTx,
    };
  }

  async getInterface(): Promise<WireGuardInterface | null> {
    const { iface } = await this.fetchRuntimeState();
    return iface;
  }

  async getPeers(): Promise<WireGuardPeer[]> {
    const { peers } = await this.fetchRuntimeState();
    return peers;
  }

  async getPeer(publicKey: string): Promise<WireGuardPeer | null> {
    const cleanKey = this.validatePublicKey(publicKey);
    const peers = await this.getPeers();
    return peers.find((p) => p.publicKey === cleanKey) || null;
  }

  async addPeer(options: AddPeerOptions): Promise<boolean> {
    const ifaceName = this.sanitizeInterface();
    const cleanPublicKey = this.validatePublicKey(options.publicKey);
    const sanitizedIps = options.allowedIPs.map((ip) => this.validateIpAddress(ip));

    if (sanitizedIps.length === 0) {
      throw new Error('At least one valid allowed IP address must be assigned to the peer.');
    }

    const args = ['set', ifaceName, 'peer', cleanPublicKey, 'allowed-ips', sanitizedIps.join(',')];

    if (options.endpoint && /^[a-zA-Z0-9.:_-]+$/.test(options.endpoint.trim())) {
      args.push('endpoint', options.endpoint.trim());
    }

    if (options.presharedKey && /^[A-Za-z0-9+/]{43}=$/.test(options.presharedKey.trim())) {
      args.push('preshared-key', options.presharedKey.trim());
    }

    await this.runWgCommand(args);

    // Post-provisioning verification: verify the peer actually exists on the active interface
    const verifiedPeer = await this.getPeer(cleanPublicKey);
    if (!verifiedPeer) {
      throw new Error(
        `WireGuard peer post-provisioning verification failed: Peer ${cleanPublicKey} was not found on interface "${ifaceName}" after running "wg set".`
      );
    }

    return true;
  }

  async removePeer(publicKey: string): Promise<boolean> {
    const ifaceName = this.sanitizeInterface();
    const cleanPublicKey = this.validatePublicKey(publicKey);

    await this.runWgCommand(['set', ifaceName, 'peer', cleanPublicKey, 'remove']);
    return true;
  }

  async getPeerStatistics(): Promise<Record<string, PeerStats>> {
    const peers = await this.getPeers();
    const now = Math.floor(Date.now() / 1000);
    const stats: Record<string, PeerStats> = {};

    for (const p of peers) {
      const isConnected = p.latestHandshake > 0 && now - p.latestHandshake < 180;
      stats[p.publicKey] = {
        publicKey: p.publicKey,
        bytesReceived: p.transferRx,
        bytesSent: p.transferTx,
        latestHandshake: p.latestHandshake,
        isConnected,
      };
    }

    return stats;
  }

  async startServer(): Promise<boolean> {
    const ifaceName = this.sanitizeInterface();
    const serviceName = `WireGuardTunnel$${ifaceName}`;

    if (process.platform === 'win32') {
      try {
        await execFileAsync('sc.exe', ['start', serviceName], { timeout: 10000 });
        return true;
      } catch (scErr) {
        // Fallback to net start
        await execFileAsync('net.exe', ['start', serviceName], { timeout: 10000 });
        return true;
      }
    } else {
      // Linux fallback: wg-quick up
      try {
        await execFileAsync('wg-quick', ['up', ifaceName], { timeout: 10000 });
        return true;
      } catch (err: unknown) {
        throw new Error(`Failed to start WireGuard interface on ${process.platform}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  async stopServer(): Promise<boolean> {
    const ifaceName = this.sanitizeInterface();
    const serviceName = `WireGuardTunnel$${ifaceName}`;

    if (process.platform === 'win32') {
      try {
        await execFileAsync('sc.exe', ['stop', serviceName], { timeout: 10000 });
        return true;
      } catch (scErr) {
        // Fallback to net stop
        await execFileAsync('net.exe', ['stop', serviceName], { timeout: 10000 });
        return true;
      }
    } else {
      // Linux fallback: wg-quick down
      try {
        await execFileAsync('wg-quick', ['down', ifaceName], { timeout: 10000 });
        return true;
      } catch (err: unknown) {
        throw new Error(`Failed to stop WireGuard interface on ${process.platform}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  async restartServer(): Promise<boolean> {
    try {
      await this.stopServer();
    } catch {
      // Ignore if was not running
    }
    await new Promise((r) => setTimeout(r, 1000));
    return this.startServer();
  }
}
