/**
 * Foundation Polytechnic VPN Management Portal
 * WireGuard Runtime <-> SQLite Profile Synchronization & Traffic Auditing
 */

import { prisma } from '../../lib/prisma';
import { dbService } from '../../server/services/db';
import { IWireGuardService, WireGuardPeer } from './WireGuardService';
import { wireGuardFactory } from './index';

export type PeerConnectionStatus = 'CONNECTED' | 'OFFLINE' | 'NEVER_CONNECTED' | 'PEER NOT FOUND';

export interface CombinedClientInfo {
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
  status: 'active' | 'revoked' | 'inactive';
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

export class ClientSyncService {
  /**
   * Memory state tracker to detect genuine connection transitions
   * (e.g. OFFLINE -> CONNECTED or CONNECTED -> OFFLINE) without duplicate logs.
   */
  private connectionStateMap = new Map<string, PeerConnectionStatus>();
  private isInitialized = false;
  private isReconciling = false;

  /**
   * Configurable handshake timeout threshold (in seconds).
   * Default: 180 seconds.
   */
  getHandshakeTimeoutSeconds(): number {
    const envVal = process.env.WG_HANDSHAKE_TIMEOUT_SECONDS || process.env.WG_HANDSHAKE_TIMEOUT;
    if (envVal) {
      const parsed = parseInt(envVal, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 180;
  }

  /**
   * Synchronizes SQLite profiles with WireGuard live state
   */
  async reconcileWireGuardState(service: IWireGuardService) {
    if (this.isReconciling) return;
    this.isReconciling = true;

    try {
      const profiles = dbService.getProfiles();
      const expectedPeers = profiles.map(p => ({
        publicKey: p.publicKey,
        allowedIPs: [p.vpnIp.includes('/') ? p.vpnIp : `${p.vpnIp}/32`],
        endpoint: p.endpoint || undefined,
        status: p.status.toLowerCase(),
      }));

      const { added, removed, failed } = await service.syncPeers(expectedPeers);

      if (added > 0 || removed > 0) {
        await prisma.auditLog.create({
          data: {
            action: 'VPN_STATE_RECONCILED',
            description: `Reconciler synced state: ${added} added, ${removed} removed, ${failed} failed.`,
            actor: 'SYSTEM',
            targetType: 'VPN_SYSTEM',
            targetId: 'wireguard-service',
            metadata: JSON.stringify({ added, removed, failed }),
          }
        }).catch(() => {});
      }
    } catch (error) {
      console.error('[Reconciler] Failed to reconcile WireGuard state:', error);
    } finally {
      this.isReconciling = false;
    }
  }

  /**
   * Reads actual WireGuard peer runtime information and combines it with SQLite profile data.
   * WireGuard's live runtime state is the single source of truth for connection status and throughput.
   *
   * SECURITY: Private keys are NEVER returned or exposed.
   */
  async getConnectedClients(service?: IWireGuardService): Promise<CombinedClientInfo[]> {
    const activeService = service || (await wireGuardFactory.resolveService());
    const timeoutSeconds = this.getHandshakeTimeoutSeconds();

    const [profiles, peers] = await Promise.all([
      prisma.vpnProfile.findMany({
        orderBy: { vpnIp: 'asc' },
      }),
      activeService.getPeers().catch(() => [] as WireGuardPeer[]),
    ]);

    const peerMap = new Map<string, WireGuardPeer>();
    for (const peer of peers) {
      peerMap.set(peer.publicKey, peer);
    }

    const processedPeerKeys = new Set<string>();
    const combinedList: CombinedClientInfo[] = [];
    const now = Math.floor(Date.now() / 1000);

    // 1. Process SQLite Profiles matched with WireGuard Peers
    for (const profile of profiles) {
      const peer = peerMap.get(profile.publicKey);
      if (peer) {
        processedPeerKeys.add(profile.publicKey);

        const isConnected = peer.latestHandshake > 0 && now - peer.latestHandshake <= timeoutSeconds;
        const connectionStatus: PeerConnectionStatus = isConnected
          ? 'CONNECTED'
          : peer.latestHandshake > 0
          ? 'OFFLINE'
          : 'NEVER_CONNECTED';

        const handshakeDate =
          peer.latestHandshake > 0
            ? new Date(peer.latestHandshake * 1000).toISOString()
            : profile.lastHandshake
            ? profile.lastHandshake.toISOString()
            : null;

        combinedList.push({
          id: profile.id,
          profileId: profile.id,
          student: {
            id: profile.id,
            name: profile.name,
            studentId: profile.studentId,
            department: profile.department,
            email: profile.email,
            phone: profile.phone,
            description: profile.description,
            status: profile.status,
          },
          fullName: profile.name,
          studentId: profile.studentId,
          department: profile.department || 'General Academic',
          email: profile.email,
          phone: profile.phone || '',
          description: profile.description || undefined,
          vpnIp: profile.vpnIp,
          publicKey: profile.publicKey,
          connectionStatus,
          status: (profile.status.toLowerCase() as any) || 'active',
          isConnected,
          latestHandshake: handshakeDate,
          latestHandshakeEpoch: peer.latestHandshake,
          lastSeen: handshakeDate,
          bytesReceived: peer.transferRx,
          bytesSent: peer.transferTx,
          totalTraffic: peer.transferRx + peer.transferTx,
          totalBytes: peer.transferRx + peer.transferTx,
          endpoint: peer.endpoint || profile.endpoint || undefined,
          isUnknownPeer: false,
        });
      } else {
        // Section 17: Missing WireGuard Peers
        // Database profile exists, but public key is not in active WireGuard interface.
        // Marked as "PEER NOT FOUND".
        const lastHandshakeDate = profile.lastHandshake ? profile.lastHandshake.toISOString() : null;

        combinedList.push({
          id: profile.id,
          profileId: profile.id,
          student: {
            id: profile.id,
            name: profile.name,
            studentId: profile.studentId,
            department: profile.department,
            email: profile.email,
            phone: profile.phone,
            description: profile.description,
            status: profile.status,
          },
          fullName: profile.name,
          studentId: profile.studentId,
          department: profile.department || 'General Academic',
          email: profile.email,
          phone: profile.phone || '',
          description: profile.description || undefined,
          vpnIp: profile.vpnIp,
          publicKey: profile.publicKey,
          connectionStatus: 'PEER NOT FOUND',
          status: (profile.status.toLowerCase() as any) || 'active',
          isConnected: false,
          latestHandshake: lastHandshakeDate,
          latestHandshakeEpoch: profile.lastHandshake
            ? Math.floor(profile.lastHandshake.getTime() / 1000)
            : 0,
          lastSeen: lastHandshakeDate,
          bytesReceived: Number(profile.bytesReceived || 0),
          bytesSent: Number(profile.bytesSent || 0),
          totalTraffic: Number((profile.bytesReceived || BigInt(0)) + (profile.bytesSent || BigInt(0))),
          totalBytes: Number((profile.bytesReceived || BigInt(0)) + (profile.bytesSent || BigInt(0))),
          endpoint: profile.endpoint || undefined,
          isUnknownPeer: false,
        });
      }
    }

    // 2. Section 16: Unknown WireGuard Peers
    // Process any WireGuard peers that do not have a matching profile in SQLite
    for (const peer of peers) {
      if (!processedPeerKeys.has(peer.publicKey)) {
        const isConnected = peer.latestHandshake > 0 && now - peer.latestHandshake <= timeoutSeconds;
        const assignedIp = peer.allowedIPs[0]?.replace(/\/32$/, '') || 'Unknown Subnet';
        const handshakeDate =
          peer.latestHandshake > 0 ? new Date(peer.latestHandshake * 1000).toISOString() : null;

        const connectionStatus: PeerConnectionStatus = isConnected
          ? 'CONNECTED'
          : peer.latestHandshake > 0
          ? 'OFFLINE'
          : 'NEVER_CONNECTED';

        combinedList.push({
          id: `wg-${peer.publicKey.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '')}`,
          profileId: undefined,
          student: null, // Unknown/unregistered client peer
          fullName: 'Unknown Peer (External / Manual)',
          studentId: 'UNREGISTERED',
          department: 'External WireGuard Peer',
          email: '',
          phone: '',
          description: 'Peer present in WireGuard interface without SQLite database profile',
          vpnIp: assignedIp,
          publicKey: peer.publicKey,
          connectionStatus,
          status: isConnected ? 'active' : 'inactive',
          isConnected,
          latestHandshake: handshakeDate,
          latestHandshakeEpoch: peer.latestHandshake,
          lastSeen: handshakeDate,
          bytesReceived: peer.transferRx,
          bytesSent: peer.transferTx,
          totalTraffic: peer.transferRx + peer.transferTx,
          totalBytes: peer.transferRx + peer.transferTx,
          endpoint: peer.endpoint,
          isUnknownPeer: true,
        });
      }
    }

    return combinedList;
  }

  /**
   * Records actual WireGuard runtime statistics into SQLite TrafficSnapshot table,
   * detects connection status transitions (CONNECTED <-> OFFLINE), and logs meaningful audit events.
   *
   * Only creates a snapshot when the corresponding peer profile can be identified by publicKey.
   * Matches WireGuard publicKey -> VpnProfile.publicKey (NEVER by name or student ID).
   */
  async recordTrafficSnapshots(service?: IWireGuardService): Promise<{
    recordedCount: number;
    connectionEvents: number;
  }> {
    const activeService = service || (await wireGuardFactory.resolveService());
    
    // Reconcile state before polling
    await this.reconcileWireGuardState(activeService);

    const peers = await activeService.getPeers().catch(() => [] as WireGuardPeer[]);
    const timeoutSeconds = this.getHandshakeTimeoutSeconds();

    const profiles = await prisma.vpnProfile.findMany();
    const profileMap = new Map(profiles.map((p) => [p.publicKey, p]));
    const peerMap = new Map(peers.map((p) => [p.publicKey, p]));

    const now = Math.floor(Date.now() / 1000);
    const snapshotDate = new Date();
    let recordedCount = 0;
    let connectionEvents = 0;

    for (const profile of profiles) {
      const peer = peerMap.get(profile.publicKey);
      const isConnected = !!(peer && peer.latestHandshake > 0 && now - peer.latestHandshake <= timeoutSeconds);
      const currentStatus: PeerConnectionStatus = peer
        ? isConnected
          ? 'CONNECTED'
          : peer.latestHandshake > 0
          ? 'OFFLINE'
          : 'NEVER_CONNECTED'
        : 'PEER NOT FOUND';

      const previousStatus = this.connectionStateMap.get(profile.id);

      // Section 13, 14, 15: Meaningful Connection Transition Auditing
      if (this.isInitialized && previousStatus !== undefined) {
        if (previousStatus !== 'CONNECTED' && currentStatus === 'CONNECTED') {
          // OFFLINE -> CONNECTED Transition
          connectionEvents++;
          const metadata = {
            profileId: profile.id,
            studentId: profile.studentId,
            vpnIp: profile.vpnIp,
            publicKey: profile.publicKey,
            endpoint: peer?.endpoint || 'Unknown Endpoint',
            timestamp: snapshotDate.toISOString(),
          };

          await prisma.auditLog.create({
            data: {
              action: 'VPN_CLIENT_CONNECTED',
              description: `Client established active tunnel: ${profile.name} (${profile.studentId}) from ${peer?.endpoint || 'Unknown Endpoint'}`,
              actor: 'SYSTEM',
              targetType: 'VPN_PROFILE',
              targetId: profile.id,
              metadata: JSON.stringify(metadata),
            },
          }).catch(() => {});

          dbService.addAuditLog({
            eventType: 'client_connected',
            profileId: profile.id,
            profileName: profile.name,
            description: `Client established active tunnel from ${peer?.endpoint || 'unknown endpoint'}`,
            ipAddress: profile.vpnIp,
            severity: 'info',
            metadata,
          });
        } else if (previousStatus === 'CONNECTED' && currentStatus !== 'CONNECTED') {
          // CONNECTED -> OFFLINE Transition
          connectionEvents++;
          const metadata = {
            profileId: profile.id,
            studentId: profile.studentId,
            vpnIp: profile.vpnIp,
            publicKey: profile.publicKey,
            endpoint: peer?.endpoint || 'Unknown Endpoint',
            timestamp: snapshotDate.toISOString(),
          };

          await prisma.auditLog.create({
            data: {
              action: 'VPN_CLIENT_DISCONNECTED',
              description: `Client session terminated/expired: ${profile.name} (${profile.studentId})`,
              actor: 'SYSTEM',
              targetType: 'VPN_PROFILE',
              targetId: profile.id,
              metadata: JSON.stringify(metadata),
            },
          }).catch(() => {});

          dbService.addAuditLog({
            eventType: 'client_disconnected',
            profileId: profile.id,
            profileName: profile.name,
            description: `Client handshake expired or connection closed`,
            ipAddress: profile.vpnIp,
            severity: 'info',
            metadata,
          });
        }
      }

      this.connectionStateMap.set(profile.id, currentStatus);

      if (peer) {
        const handshakeDate = peer.latestHandshake > 0 ? new Date(peer.latestHandshake * 1000) : null;

        // Update persistent profile metrics in SQLite
        await prisma.vpnProfile.update({
          where: { id: profile.id },
          data: {
            bytesReceived: BigInt(peer.transferRx),
            bytesSent: BigInt(peer.transferTx),
            isConnected,
            endpoint: peer.endpoint || profile.endpoint,
            lastHandshake: handshakeDate || profile.lastHandshake,
            updatedAt: snapshotDate,
          },
        }).catch(() => {});

        // Keep dbService in sync
        dbService.updateProfile(profile.id, {
          bytesReceived: peer.transferRx,
          bytesSent: peer.transferTx,
          lastHandshake: handshakeDate ? handshakeDate.toISOString() : profile.lastHandshake?.toISOString() || null,
          isConnected,
          endpoint: peer.endpoint || profile.endpoint || undefined,
        });

        // Section 4 & 5: Record snapshot for known profile
        // Record only when there is traffic activity or counter changes
        await prisma.trafficSnapshot.create({
          data: {
            vpnProfileId: profile.id,
            bytesReceived: BigInt(peer.transferRx),
            bytesSent: BigInt(peer.transferTx),
            timestamp: snapshotDate,
          },
        }).catch(() => {});

        recordedCount++;
      }
    }

    this.isInitialized = true;
    return { recordedCount, connectionEvents };
  }

  /**
   * Section 6 & 7: Traffic history and summary query method
   */
  async getTrafficHistory(params?: { profileId?: string; from?: string; to?: string }) {
    const whereClause: any = {};

    if (params?.profileId && params.profileId !== 'all') {
      whereClause.vpnProfileId = params.profileId;
    }

    if (params?.from || params?.to) {
      whereClause.timestamp = {};
      if (params.from) whereClause.timestamp.gte = new Date(params.from);
      if (params.to) whereClause.timestamp.lte = new Date(params.to);
    }

    const [snapshots, profiles] = await Promise.all([
      prisma.trafficSnapshot.findMany({
        where: whereClause,
        orderBy: { timestamp: 'asc' },
        take: 100,
        include: {
          vpnProfile: {
            select: { id: true, name: true, studentId: true, vpnIp: true },
          },
        },
      }),
      prisma.vpnProfile.findMany({
        orderBy: { name: 'asc' },
      }),
    ]);

    // Live WireGuard cumulative counters
    let totalCumulativeRx = 0;
    let totalCumulativeTx = 0;
    let activeClientsCount = 0;

    const clientBreakdown = profiles.map((p) => {
      const rx = Number(p.bytesReceived || 0);
      const tx = Number(p.bytesSent || 0);
      totalCumulativeRx += rx;
      totalCumulativeTx += tx;
      if (p.isConnected) activeClientsCount++;

      return {
        id: p.id,
        name: p.name,
        studentId: p.studentId,
        department: p.department || 'General Academic',
        vpnIp: p.vpnIp,
        status: p.status,
        bytesReceived: rx,
        bytesSent: tx,
        totalBytes: rx + tx,
        lastHandshake: p.lastHandshake ? p.lastHandshake.toISOString() : null,
        isConnected: p.isConnected,
      };
    });

    const formattedSnapshots = snapshots.map((s) => ({
      id: s.id,
      profileId: s.vpnProfileId,
      profileName: s.vpnProfile?.name || 'Academic VPN User',
      timestamp: s.timestamp.toISOString(),
      bytesReceived: Number(s.bytesReceived),
      bytesSent: Number(s.bytesSent),
      totalBytes: Number(s.bytesReceived + s.bytesSent),
    }));

    return {
      profileId: params?.profileId || 'all',
      data: formattedSnapshots.map((s) => ({
        timestamp: s.timestamp,
        bytesReceived: s.bytesReceived,
        bytesSent: s.bytesSent,
        totalBytes: s.totalBytes,
      })),
      summary: {
        totalBytesReceived: totalCumulativeRx,
        totalBytesSent: totalCumulativeTx,
        totalTraffic: totalCumulativeRx + totalCumulativeTx,
        activeClients: activeClientsCount,
        totalProfiles: profiles.length,
        // Detailed distinctions (Section 7)
        cumulativeRxBytes: totalCumulativeRx,
        cumulativeTxBytes: totalCumulativeTx,
        snapshotCount: formattedSnapshots.length,
      },
      clientBreakdown,
      historySnapshots: formattedSnapshots,
      privacyStatement:
        'Auditing compliance: Traffic data records cryptographic packet volume metadata (bytes received and bytes transmitted) and connection timestamps only. No payload, keystroke, URL, or plain-text inspection is performed.',
    };
  }
}

export const clientSyncService = new ClientSyncService();
