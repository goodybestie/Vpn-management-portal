/**
 * Foundation Polytechnic VPN Management Portal
 * Mock WireGuard Service Implementation
 * Used for development testing, CI, and cloud sandbox environments where Windows wg.exe is not installed
 */

import {
  IWireGuardService,
  WireGuardServerStatus,
  WireGuardInterface,
  WireGuardPeer,
  WireGuardInterfaceStatus,
  AddPeerOptions,
  PeerStats,
} from './WireGuardService';
import { isValidWireGuardPublicKey, generateWireGuardKeyPair } from '../../server/services/crypto';

export class MockWireGuardService implements IWireGuardService {
  readonly serviceName = 'Simulated WireGuard Development Adapter';
  readonly isSimulation = true;

  private isOnline = true;
  private serverPublicKey: string;
  private peers: Map<string, WireGuardPeer> = new Map();

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

  constructor() {
    const envKey = process.env.WG_SERVER_PUBLIC_KEY?.trim();
    if (envKey && isValidWireGuardPublicKey(envKey)) {
      this.serverPublicKey = envKey;
    } else {
      // Generate a cryptographically valid Curve25519 32-byte Base64 keypair
      this.serverPublicKey = generateWireGuardKeyPair().publicKey;
    }
    this.seedPeers();
  }

  /**
   * Dynamically retrieves the validated 32-byte Base64 WireGuard server public key.
   */
  async getServerPublicKey(): Promise<string | null> {
    const envKey = process.env.WG_SERVER_PUBLIC_KEY?.trim();
    if (envKey && isValidWireGuardPublicKey(envKey)) {
      this.serverPublicKey = envKey;
      return envKey;
    }
    if (this.serverPublicKey && isValidWireGuardPublicKey(this.serverPublicKey)) {
      return this.serverPublicKey;
    }
    return null;
  }

  private seedPeers() {
    const now = Math.floor(Date.now() / 1000);

    // Test 3 specific: Current phone peer uses VPN IP 10.8.0.2
    this.peers.set('uY3bB7H+9n2zFm1XW8kQ0p4r5t6v7w8x9y0z1a2b3c4=', {
      publicKey: 'uY3bB7H+9n2zFm1XW8kQ0p4r5t6v7w8x9y0z1a2b3c4=',
      allowedIPs: ['10.8.0.2/32'],
      endpoint: '105.112.45.18:41230',
      latestHandshake: now - 35, // Connected 35 seconds ago
      transferRx: 1420519354,
      transferTx: 389127419,
      persistentKeepalive: 25,
    });

    // Peer 2: Student peer (10.8.0.3)
    this.peers.set('wK9pL2eNmR4tUvXyZa1B3cD5fG7hI9jK0lM2nO4pQ6r=', {
      publicKey: 'wK9pL2eNmR4tUvXyZa1B3cD5fG7hI9jK0lM2nO4pQ6r=',
      allowedIPs: ['10.8.0.3/32'],
      endpoint: '197.210.8.92:58190',
      latestHandshake: now - 78,
      transferRx: 650240456,
      transferTx: 195439327,
      persistentKeepalive: 25,
    });

    // Peer 3: Student peer (10.8.0.4)
    this.peers.set('qR7sT8uV9wX0yZ1a2B3cD4eF5gH6iJ7kL8mN9oP0qR1=', {
      publicKey: 'qR7sT8uV9wX0yZ1a2B3cD4eF5gH6iJ7kL8mN9oP0qR1=',
      allowedIPs: ['10.8.0.4/32'],
      endpoint: '102.89.34.12:49320',
      latestHandshake: now - 95,
      transferRx: 320161955,
      transferTx: 84129605,
      persistentKeepalive: 25,
    });

    // Peer 4: Staff peer (10.8.0.5)
    this.peers.set('zX1c2V3b4N5m6A7s8D9f0G1h2J3k4L5p6O7i8U9y0T1=', {
      publicKey: 'zX1c2V3b4N5m6A7s8D9f0G1h2J3k4L5p6O7i8U9y0T1=',
      allowedIPs: ['10.8.0.5/32'],
      endpoint: '105.112.98.54:52110',
      latestHandshake: now - 18,
      transferRx: 890450593,
      transferTx: 412538440,
      persistentKeepalive: 25,
    });

    // Peer 5: Inactive/Offline peer (10.8.0.6)
    this.peers.set('mN1bV2cX3zA4sD5fG6hJ7kL8pO9iU0yT1rE2wQ3a4S5=', {
      publicKey: 'mN1bV2cX3zA4sD5fG6hJ7kL8pO9iU0yT1rE2wQ3a4S5=',
      allowedIPs: ['10.8.0.6/32'],
      endpoint: undefined,
      latestHandshake: now - 86400 * 2, // 2 days ago
      transferRx: 45012030,
      transferTx: 12045000,
      persistentKeepalive: 25,
    });
  }

  async getServerStatus(): Promise<WireGuardServerStatus> {
    const peers = Array.from(this.peers.values());
    const now = Math.floor(Date.now() / 1000);

    // Increment simulated packets when online for connected peers
    if (this.isOnline) {
      for (const p of peers) {
        if (p.latestHandshake > 0 && now - p.latestHandshake < 180) {
          p.transferRx += Math.floor(Math.random() * 4000) + 1000;
          p.transferTx += Math.floor(Math.random() * 2000) + 500;
        }
      }
    }

    const activeCount = peers.filter(
      (p) => p.latestHandshake > 0 && now - p.latestHandshake < 180
    ).length;

    let totalRx = 0;
    let totalTx = 0;
    for (const p of peers) {
      totalRx += p.transferRx;
      totalTx += p.transferTx;
    }

    return {
      interface: this.interfaceName,
      address: this.serverAddress,
      port: this.serverPort,
      publicKey: this.serverPublicKey,
      status: this.isOnline ? 'RUNNING' : 'STOPPED',
      peerCount: peers.length,
      activePeersCount: this.isOnline ? activeCount : 0,
      bytesReceived: totalRx,
      bytesSent: totalTx,
      endpoint: this.serverEndpoint,
      dns: this.clientDns,
      isWindows: process.platform === 'win32',
      serviceName: this.serviceName,
      isSimulation: true,
      details: this.isOnline
        ? 'Simulated WireGuard adapter active for development preview.'
        : 'WireGuard service is stopped.',
    };
  }

  async getInterfaceStatus(iface = this.interfaceName): Promise<WireGuardInterfaceStatus> {
    const peerMap: Record<string, WireGuardPeer> = {};
    let totalRx = 0;
    let totalTx = 0;

    for (const p of this.peers.values()) {
      peerMap[p.publicKey] = { ...p };
      totalRx += p.transferRx;
      totalTx += p.transferTx;
    }

    return {
      interface: iface,
      publicKey: this.serverPublicKey,
      listeningPort: this.serverPort,
      peers: peerMap,
      isOnline: this.isOnline,
      totalRx,
      totalTx,
    };
  }

  async getInterface(): Promise<WireGuardInterface | null> {
    if (!this.isOnline) return null;
    return {
      name: this.interfaceName,
      publicKey: this.serverPublicKey,
      listeningPort: this.serverPort,
    };
  }

  async getPeers(): Promise<WireGuardPeer[]> {
    if (!this.isOnline) return [];
    const now = Math.floor(Date.now() / 1000);
    for (const p of this.peers.values()) {
      if (p.latestHandshake > 0 && now - p.latestHandshake < 180) {
        // Keep active simulated peers fresh with realistic keepalive
        p.latestHandshake = now - Math.floor(Math.random() * 25 + 5);
      }
    }
    return Array.from(this.peers.values());
  }

  async getPeer(publicKey: string): Promise<WireGuardPeer | null> {
    if (!this.isOnline) return null;
    return this.peers.get(publicKey) || null;
  }

  async addPeer(options: AddPeerOptions): Promise<boolean> {
    this.peers.set(options.publicKey, {
      publicKey: options.publicKey,
      allowedIPs: options.allowedIPs,
      endpoint: options.endpoint,
      latestHandshake: 0,
      transferRx: 0,
      transferTx: 0,
      persistentKeepalive: 25,
    });
    return true;
  }

  async removePeer(publicKey: string): Promise<boolean> {
    return this.peers.delete(publicKey);
  }

  async getPeerStatistics(): Promise<Record<string, PeerStats>> {
    const stats: Record<string, PeerStats> = {};
    const now = Math.floor(Date.now() / 1000);

    for (const p of this.peers.values()) {
      const isConnected = this.isOnline && p.latestHandshake > 0 && now - p.latestHandshake < 180;
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
    this.isOnline = true;
    return true;
  }

  async stopServer(): Promise<boolean> {
    this.isOnline = false;
    return true;
  }

  async restartServer(): Promise<boolean> {
    this.isOnline = false;
    await new Promise((r) => setTimeout(r, 400));
    this.isOnline = true;
    return true;
  }

  async syncPeers(expectedPeers: { publicKey: string; allowedIPs: string[]; endpoint?: string; status: string }[]): Promise<{ added: number; removed: number; failed: number }> {
    return { added: 0, removed: 0, failed: 0 };
  }
}
