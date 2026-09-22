export type ProfileStatus = 'active' | 'revoked' | 'inactive';

export type PeerConnectionStatus = 'CONNECTED' | 'OFFLINE' | 'NEVER_CONNECTED' | 'PEER NOT FOUND';

export type AdminRole = 'ADMIN' | 'VPN_MANAGER' | 'AUDITOR';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  createdAt: string;
  updatedAt: string;
}

export type AdminUserSafe = Omit<AdminUser, 'passwordHash'>;

export interface AdminSession {
  id: string;
  adminId: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConnectedClientPeer {
  id: string;
  profileId?: string;
  student?: {
    id: string;
    name: string;
    studentId: string;
    department?: string | null;
    email?: string | null;
    phone?: string | null;
    description?: string | null;
    status: string;
  } | null;
  fullName: string;
  studentId: string;
  department: string;
  email: string;
  phone: string;
  description?: string;
  vpnIp: string;
  publicKey: string;
  connectionStatus: PeerConnectionStatus;
  status: ProfileStatus;
  isConnected: boolean;
  latestHandshake: string | null;
  latestHandshakeEpoch: number;
  lastSeen: string | null;
  bytesReceived: number;
  bytesSent: number;
  totalTraffic: number;
  totalBytes: number;
  endpoint?: string;
  isUnknownPeer?: boolean;
}

export interface VpnProfile {
  id: string;
  fullName: string;
  studentId: string; // Matric number / Staff ID
  department: string;
  email: string;
  phone: string;
  description?: string;
  vpnIp: string;
  publicKey: string;
  status: ProfileStatus;
  createdAt: string;
  updatedAt: string;
  lastHandshake: string | null;
  bytesReceived: number;
  bytesSent: number;
  isConnected: boolean;
  endpoint?: string;
  connectionStatus?: PeerConnectionStatus;
  lastSeen?: string | null;
  totalTraffic?: number;
}

export type AuditEventType =
  | 'profile_created'
  | 'profile_updated'
  | 'profile_revoked'
  | 'profile_deleted'
  | 'client_connected'
  | 'client_disconnected'
  | 'config_generated'
  | 'server_started'
  | 'server_stopped'
  | 'server_restarted'
  | 'config_changed'
  | 'permission_denied'
  | 'admin_login_success'
  | 'admin_login_failed'
  | 'admin_logout';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'success';

export type CanonicalAuditAction =
  | 'ADMIN_LOGIN_SUCCESS'
  | 'ADMIN_LOGIN_FAILED'
  | 'ADMIN_LOGOUT'
  | 'VPN_PROFILE_CREATED'
  | 'VPN_PROFILE_UPDATED'
  | 'VPN_PROFILE_REVOKED'
  | 'VPN_PROFILE_DELETED'
  | 'VPN_CONFIG_GENERATED'
  | 'VPN_CLIENT_CONNECTED'
  | 'VPN_CLIENT_DISCONNECTED'
  | 'VPN_SERVER_STARTED'
  | 'VPN_SERVER_STOPPED'
  | 'VPN_SERVER_RESTARTED';

export interface AuditLog {
  id: string;
  action?: string;
  description: string;
  actor?: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  // Backward compatibility fields
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  profileId?: string;
  profileName?: string;
  adminEmail?: string;
  ipAddress?: string;
}

export interface PaginatedAuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TrafficSnapshot {
  id: string;
  profileId: string;
  profileName: string;
  timestamp: string;
  bytesReceived: number;
  bytesSent: number;
  totalBytes: number;
}

export interface ServerStatus {
  status: 'online' | 'offline' | 'degraded';
  interface: string;
  vpnAddress: string;
  listeningPort: number;
  publicKey: string;
  activePeersCount: number;
  totalProfilesCount: number;
  bytesReceived: number;
  bytesSent: number;
  endpoint: string;
  dns: string;
  uptime: string;
  platform: string;
  isWindows: boolean;
  wireguardInstalled: boolean;
  wireguardBinaryPath: string;
  configPath: string;
  driverVersion?: string;
}

export interface WireGuardClientConfig {
  profileId: string;
  clientIp: string;
  clientPrivateKey?: string;
  clientPublicKey: string;
  serverPublicKey: string;
  serverEndpoint: string;
  dns: string;
  confContent: string;
}

export interface TrafficClientBreakdown {
  id: string;
  name: string;
  studentId: string;
  department: string;
  vpnIp: string;
  status: ProfileStatus;
  bytesReceived: number;
  bytesSent: number;
  totalBytes: number;
  lastHandshake: string | null;
  isConnected: boolean;
  endpoint?: string;
  connectionStatus?: PeerConnectionStatus;
}

export interface TrafficSummary {
  totalReceived: number;
  totalTransmitted: number;
  totalTraffic: number;
  activeClients: number;
  totalProfiles: number;
}

export interface TrafficResponse {
  summary: TrafficSummary;
  clientBreakdown: TrafficClientBreakdown[];
  historySnapshots: TrafficSnapshot[];
  privacyStatement: string;
  dataDistinctionNote?: string;
}
