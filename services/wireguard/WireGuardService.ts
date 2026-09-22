/**
 * Foundation Polytechnic VPN Management Portal
 * WireGuard Service Abstraction Layer & Core Types
 */

export interface WireGuardPeer {
  publicKey: string;
  allowedIPs: string[];
  endpoint?: string;
  latestHandshake: number; // Unix timestamp in seconds
  transferRx: number; // Bytes received
  transferTx: number; // Bytes sent
  persistentKeepalive?: number;
}

export interface WireGuardInterface {
  name: string;
  publicKey: string;
  listeningPort: number;
  fwmark?: string;
}

export type WireGuardServerStatusCode = 'RUNNING' | 'STOPPED' | 'ERROR' | 'UNAVAILABLE';

export interface WireGuardServerStatus {
  interface: string;
  address: string;
  port: number;
  publicKey: string;
  status: WireGuardServerStatusCode;
  peerCount: number;
  details?: string;
  // Extended diagnostics for UI dashboard compatibility
  activePeersCount?: number;
  bytesReceived?: number;
  bytesSent?: number;
  endpoint?: string;
  dns?: string;
  isWindows?: boolean;
  serviceName?: string;
  isSimulation?: boolean;
}

export interface AddPeerOptions {
  publicKey: string;
  allowedIPs: string[];
  presharedKey?: string;
  endpoint?: string;
}

export interface PeerStats {
  publicKey: string;
  bytesReceived: number;
  bytesSent: number;
  latestHandshake: number; // Unix timestamp in seconds
  isConnected: boolean;
}

export interface WireGuardInterfaceStatus {
  interface: string;
  publicKey: string;
  listeningPort: number;
  peers: Record<string, WireGuardPeer>;
  isOnline: boolean;
  totalRx: number;
  totalTx: number;
}

export interface IWireGuardService {
  readonly serviceName: string;
  readonly isSimulation: boolean;

  /**
   * Retrieves high-level server status (interface, address, port, public key, status, peer count)
   */
  getServerStatus(): Promise<WireGuardServerStatus>;

  /**
   * Dynamically retrieves the validated 32-byte Base64 WireGuard server public key.
   * Never hardcoded, strictly validated.
   */
  getServerPublicKey(interfaceName?: string): Promise<string | null>;

  /**
   * Retrieves interface status and peer map
   */
  getInterfaceStatus(interfaceName?: string): Promise<WireGuardInterfaceStatus>;

  /**
   * Retrieves low-level interface details, strictly excluding any private keys
   */
  getInterface(): Promise<WireGuardInterface | null>;

  /**
   * Retrieves all live peers registered to the WireGuard interface
   */
  getPeers(): Promise<WireGuardPeer[]>;

  /**
   * Retrieves a specific peer by its public key
   */
  getPeer(publicKey: string): Promise<WireGuardPeer | null>;

  /**
   * Registers a peer into the active WireGuard interface
   */
  addPeer(options: AddPeerOptions): Promise<boolean>;

  /**
   * Removes a peer from the active WireGuard interface
   */
  removePeer(publicKey: string): Promise<boolean>;

  /**
   * Retrieves real-time transfer and handshake statistics for all peers
   */
  getPeerStatistics(): Promise<Record<string, PeerStats>>;

  /**
   * Starts the WireGuard interface/service
   */
  startServer(): Promise<boolean>;

  /**
   * Stops the WireGuard interface/service
   */
  stopServer(): Promise<boolean>;

  /**
   * Restarts the WireGuard interface/service
   */
  restartServer(): Promise<boolean>;

  /**
   * Synchronizes expected peers with the live WireGuard state
   */
  syncPeers(expectedPeers: { publicKey: string; allowedIPs: string[]; endpoint?: string; status: string }[]): Promise<{ added: number; removed: number; failed: number }>;
}
