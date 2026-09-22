/**
 * Foundation Polytechnic, Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria
 * VPN Traffic Database Service Layer
 */

import { prisma } from '../../lib/prisma';
import { TrafficSnapshot as UiTrafficSnapshot } from '../../src/types';

export interface RecordTrafficSnapshotParams {
  vpnProfileId: string;
  bytesReceived: number | bigint;
  bytesSent: number | bigint;
  timestamp?: Date | string;
}

/**
 * Record a periodic traffic snapshot for a VPN profile
 */
export async function recordTrafficSnapshot(params: RecordTrafficSnapshotParams) {
  // Check if profile exists before recording relation
  const profile = await prisma.vpnProfile.findUnique({
    where: { id: params.vpnProfileId },
  });

  if (!profile) return null;

  return await prisma.trafficSnapshot.create({
    data: {
      vpnProfileId: params.vpnProfileId,
      bytesReceived: BigInt(params.bytesReceived),
      bytesSent: BigInt(params.bytesSent),
      timestamp: params.timestamp ? new Date(params.timestamp) : new Date(),
    },
  });
}

/**
 * Retrieve traffic snapshots formatted for frontend charts
 */
export async function getTrafficSnapshots(limit = 50): Promise<UiTrafficSnapshot[]> {
  const snapshots = await prisma.trafficSnapshot.findMany({
    include: {
      vpnProfile: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  return snapshots.map((s) => {
    const rx = Number(s.bytesReceived);
    const tx = Number(s.bytesSent);
    return {
      id: s.id,
      profileId: s.vpnProfileId,
      profileName: s.vpnProfile?.name || 'Unknown Profile',
      timestamp: s.timestamp.toISOString(),
      bytesReceived: rx,
      bytesSent: tx,
      totalBytes: rx + tx,
    };
  });
}

/**
 * Get aggregate traffic summary across all profiles
 */
export async function getTrafficSummary() {
  const profiles = await prisma.vpnProfile.findMany({
    select: {
      id: true,
      name: true,
      studentId: true,
      department: true,
      vpnIp: true,
      status: true,
      bytesReceived: true,
      bytesSent: true,
      lastHandshake: true,
      isConnected: true,
    },
  });

  let totalReceived = 0;
  let totalTransmitted = 0;
  let activeClients = 0;

  const clientBreakdown = profiles.map((p) => {
    const rx = Number(p.bytesReceived);
    const tx = Number(p.bytesSent);
    totalReceived += rx;
    totalTransmitted += tx;
    if (p.isConnected) activeClients++;

    return {
      id: p.id,
      name: p.name,
      studentId: p.studentId,
      department: p.department || 'General Studies',
      vpnIp: p.vpnIp,
      status: p.status.toLowerCase(),
      bytesReceived: rx,
      bytesSent: tx,
      totalBytes: rx + tx,
      lastHandshake: p.lastHandshake ? p.lastHandshake.toISOString() : null,
      isConnected: p.isConnected,
    };
  });

  const snapshots = await getTrafficSnapshots(30);

  return {
    summary: {
      totalReceived,
      totalTransmitted,
      totalTraffic: totalReceived + totalTransmitted,
      activeClients,
      totalProfiles: profiles.length,
    },
    clientBreakdown,
    historySnapshots: snapshots,
    privacyStatement:
      'Auditing compliance: Traffic data records cryptographic packet volume metadata (bytes received and bytes transmitted) and connection timestamps only. No payload, keystroke, URL, or plain-text inspection is performed.',
  };
}
