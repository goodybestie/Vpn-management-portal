export interface WireGuardPeerInfo {
  publicKey: string;
  endpoint?: string;
  allowedIps: string[];
  latestHandshake: number; // Unix timestamp in seconds
  transferRx: number; // Bytes received
  transferTx: number; // Bytes sent
  persistentKeepalive?: number;
}

export interface WireGuardInterfaceStatus {
  interface: string;
  publicKey: string;
  listeningPort: number;
  peers: Record<string, WireGuardPeerInfo>; // keyed by public key
  isOnline: boolean;
  totalRx: number;
  totalTx: number;
}

export interface ServiceOperationResult {
  success: boolean;
  message: string;
  requiresAdmin?: boolean;
  details?: string;
}

export interface IWireGuardService {
  readonly serviceName: string;
  readonly isSimulation: boolean;
  
  /**
   * Check if WireGuard binary is present and reachable on this host
   */
  checkInstallation(): Promise<{
    installed: boolean;
    path: string;
    version?: string;
    details: string;
  }>;

  /**
   * Get live status of the WireGuard interface and all connected peers
   */
  getInterfaceStatus(interfaceName?: string): Promise<WireGuardInterfaceStatus>;

  /**
   * Register a new peer to the live WireGuard interface
   */
  addPeer(params: {
    interfaceName?: string;
    publicKey: string;
    allowedIp: string;
  }): Promise<ServiceOperationResult>;

  /**
   * Revoke or remove a peer from the live WireGuard interface
   */
  removePeer(publicKey: string, interfaceName?: string): Promise<ServiceOperationResult>;

  /**
   * Start the WireGuard tunnel service (Windows service / wg-quick)
   */
  startService(interfaceName?: string): Promise<ServiceOperationResult>;

  /**
   * Stop the WireGuard tunnel service
   */
  stopService(interfaceName?: string): Promise<ServiceOperationResult>;

  /**
   * Restart / reload the WireGuard configuration
   */
  restartService(interfaceName?: string): Promise<ServiceOperationResult>;
}
