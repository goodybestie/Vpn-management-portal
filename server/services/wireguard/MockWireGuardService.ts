import {
  IWireGuardService,
  WireGuardInterfaceStatus,
  WireGuardPeerInfo,
  ServiceOperationResult,
} from './IWireGuardService';
import { isValidWireGuardPublicKey, generateWireGuardKeyPair } from '../crypto';

export class MockWireGuardService implements IWireGuardService {
  readonly serviceName = 'Simulated WireGuard Development Engine (Linux/Cloud Sandbox Fallback)';
  readonly isSimulation = true;

  private isOnline = true;
  private interfaceName = process.env.WG_INTERFACE || 'wg0';
  private serverPublicKey: string;
  private listeningPort = 51820;

  // In-memory active peer store simulating kernel WireGuard table
  private peers: Map<string, WireGuardPeerInfo> = new Map();

  constructor() {
    const envKey = process.env.WG_SERVER_PUBLIC_KEY?.trim();
    if (envKey && isValidWireGuardPublicKey(envKey)) {
      this.serverPublicKey = envKey;
    } else {
      this.serverPublicKey = generateWireGuardKeyPair().publicKey;
    }
    this.seedMockPeers();
  }

  private seedMockPeers() {
    const now = Math.floor(Date.now() / 1000);
    // Peer 1: Active student (Computer Science)
    this.peers.set('uY3bB7H+9n2zFm1XW8kQ0p4r5t6v7w8x9y0z1a2b3c4=', {
      publicKey: 'uY3bB7H+9n2zFm1XW8kQ0p4r5t6v7w8x9y0z1a2b3c4=',
      endpoint: '105.112.45.18:41230',
      allowedIps: ['10.8.0.2/32'],
      latestHandshake: now - 35, // 35 seconds ago
      transferRx: 1420500120, // ~1.4 GB
      transferTx: 389120400, // ~389 MB
      persistentKeepalive: 25,
    });

    // Peer 2: Active student (Electrical/Electronics)
    this.peers.set('wK9pL2eNmR4tUvXyZa1B3cD5fG7hI9jK0lM2nO4pQ6r=', {
      publicKey: 'wK9pL2eNmR4tUvXyZa1B3cD5fG7hI9jK0lM2nO4pQ6r=',
      endpoint: '197.210.8.92:58190',
      allowedIps: ['10.8.0.3/32'],
      latestHandshake: now - 82, // 82 seconds ago
      transferRx: 650230100, // ~650 MB
      transferTx: 195430200, // ~195 MB
      persistentKeepalive: 25,
    });

    // Peer 3: Active student (Science Lab Tech)
    this.peers.set('qR7sT8uV9wX0yZ1a2B3cD4eF5gH6iJ7kL8mN9oP0qR1=', {
      publicKey: 'qR7sT8uV9wX0yZ1a2B3cD4eF5gH6iJ7kL8mN9oP0qR1=',
      endpoint: '102.89.34.12:49320',
      allowedIps: ['10.8.0.4/32'],
      latestHandshake: now - 110, // 110 seconds ago
      transferRx: 320140500, // ~320 MB
      transferTx: 84120300, // ~84 MB
      persistentKeepalive: 25,
    });

    // Peer 4: Faculty / Staff (Accountancy)
    this.peers.set('zX1c2V3b4N5m6A7s8D9f0G1h2J3k4L5p6O7i8U9y0T1=', {
      publicKey: 'zX1c2V3b4N5m6A7s8D9f0G1h2J3k4L5p6O7i8U9y0T1=',
      endpoint: '105.112.98.54:52110',
      allowedIps: ['10.8.0.5/32'],
      latestHandshake: now - 18, // 18 seconds ago
      transferRx: 890430120, // ~890 MB
      transferTx: 412530900, // ~412 MB
      persistentKeepalive: 25,
    });

    // Peer 5: Offline student (Last connected 2 days ago)
    this.peers.set('mN1bV2cX3zA4sD5fG6hJ7kL8pO9iU0yT1rE2wQ3a4S5=', {
      publicKey: 'mN1bV2cX3zA4sD5fG6hJ7kL8pO9iU0yT1rE2wQ3a4S5=',
      endpoint: undefined,
      allowedIps: ['10.8.0.6/32'],
      latestHandshake: now - 172800, // 2 days ago
      transferRx: 45012030,
      transferTx: 12045000,
      persistentKeepalive: 25,
    });
  }

  async checkInstallation(): Promise<{
    installed: boolean;
    path: string;
    version?: string;
    details: string;
  }> {
    return {
      installed: true,
      path: 'MOCK (Development / Cloud Sandbox Adapter)',
      version: 'MockWireGuard v1.0.0 for Foundation Polytechnic',
      details:
        'Running on simulated WireGuard service because native Windows WireGuard binary was not detected in this host environment. When deployed on the Foundation Polytechnic Windows host, the RealWireGuardService will bind directly to wg.exe.',
    };
  }

  async getInterfaceStatus(iface = this.interfaceName): Promise<WireGuardInterfaceStatus> {
    const peersObj: Record<string, WireGuardPeerInfo> = {};
    let totalRx = 0;
    let totalTx = 0;

    // Increment simulated traffic slightly on each poll if online to mimic live campus network packet flow
    const now = Math.floor(Date.now() / 1000);
    this.peers.forEach((peer, key) => {
      if (this.isOnline && peer.latestHandshake > 0 && now - peer.latestHandshake < 180) {
        peer.transferRx += Math.floor(Math.random() * 8000) + 2000;
        peer.transferTx += Math.floor(Math.random() * 4000) + 1000;
        peer.latestHandshake = now - Math.floor(Math.random() * 40);
      }
      totalRx += peer.transferRx;
      totalTx += peer.transferTx;
      peersObj[key] = { ...peer };
    });

    return {
      interface: iface,
      publicKey: this.serverPublicKey,
      listeningPort: this.listeningPort,
      peers: peersObj,
      isOnline: this.isOnline,
      totalRx,
      totalTx,
    };
  }

  async addPeer(params: {
    interfaceName?: string;
    publicKey: string;
    allowedIp: string;
  }): Promise<ServiceOperationResult> {
    const cleanIp = params.allowedIp.replace(/\/32$/, '');
    this.peers.set(params.publicKey, {
      publicKey: params.publicKey,
      allowedIps: [`${cleanIp}/32`],
      latestHandshake: 0,
      transferRx: 0,
      transferTx: 0,
      persistentKeepalive: 25,
    });

    return {
      success: true,
      message: `[Simulated] Peer registered to ${params.interfaceName || this.interfaceName} with IP ${cleanIp}/32.`,
    };
  }

  async removePeer(publicKey: string): Promise<ServiceOperationResult> {
    this.peers.delete(publicKey);
    return {
      success: true,
      message: `[Simulated] Peer revoked and removed from memory table.`,
    };
  }

  async startService(iface = this.interfaceName): Promise<ServiceOperationResult> {
    this.isOnline = true;
    return {
      success: true,
      message: `[Simulated] WireGuard tunnel service WireGuardTunnel$${iface} started.`,
    };
  }

  async stopService(iface = this.interfaceName): Promise<ServiceOperationResult> {
    this.isOnline = false;
    return {
      success: true,
      message: `[Simulated] WireGuard tunnel service WireGuardTunnel$${iface} stopped.`,
    };
  }

  async restartService(iface = this.interfaceName): Promise<ServiceOperationResult> {
    this.isOnline = true;
    return {
      success: true,
      message: `[Simulated] WireGuard tunnel service WireGuardTunnel$${iface} restarted successfully.`,
    };
  }
}
