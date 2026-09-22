/**
 * Foundation Polytechnic, Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria
 * VPN Profile Database Service Layer
 */

import { prisma } from '../../lib/prisma';
import { VpnProfile as UiVpnProfile, ProfileStatus } from '../../src/types';
import { createAuditLog } from '../audit/auditService';

export interface CreateProfileInput {
  name: string;
  studentId: string;
  department?: string;
  email: string;
  phone?: string;
  description?: string;
  vpnIp?: string;
  publicKey: string;
  privateKey?: string | null;
  actorAdminId?: string;
}

export interface UpdateProfileInput {
  name?: string;
  fullName?: string;
  department?: string;
  email?: string;
  phone?: string;
  description?: string;
  status?: string;
  bytesReceived?: number | bigint;
  bytesSent?: number | bigint;
  lastHandshake?: Date | string | null;
  isConnected?: boolean;
  endpoint?: string | null;
  actorAdminId?: string;
}

/**
 * Format Prisma VpnProfile model to UI representation
 * Enforces Security Rule: privateKey is stripped from normal responses
 */
export function formatProfileForUi(
  profile: {
    id: string;
    name: string;
    studentId: string;
    email: string;
    phone: string | null;
    department: string | null;
    description: string | null;
    vpnIp: string;
    publicKey: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    revokedAt: Date | null;
    lastHandshake: Date | null;
    bytesReceived: bigint;
    bytesSent: bigint;
    isConnected: boolean;
    endpoint: string | null;
  }
): UiVpnProfile {
  let statusNormalized: ProfileStatus = 'active';
  const s = profile.status.toLowerCase();
  if (s === 'revoked') statusNormalized = 'revoked';
  else if (s === 'disabled' || s === 'inactive') statusNormalized = 'inactive';

  return {
    id: profile.id,
    fullName: profile.name,
    studentId: profile.studentId,
    department: profile.department || 'General Studies',
    email: profile.email,
    phone: profile.phone || '',
    description: profile.description || undefined,
    vpnIp: profile.vpnIp,
    publicKey: profile.publicKey,
    status: statusNormalized,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    lastHandshake: profile.lastHandshake ? profile.lastHandshake.toISOString() : null,
    bytesReceived: Number(profile.bytesReceived),
    bytesSent: Number(profile.bytesSent),
    isConnected: profile.isConnected,
    endpoint: profile.endpoint || undefined,
  };
}

/**
 * Allocate next available VPN IP in 10.8.0.0/24 subnet
 */
export async function allocateNextVpnIp(): Promise<string> {
  const existing = await prisma.vpnProfile.findMany({
    select: { vpnIp: true },
  });
  const usedIps = new Set(existing.map((p) => p.vpnIp));

  for (let i = 2; i <= 254; i++) {
    const candidate = `10.8.0.${i}`;
    if (!usedIps.has(candidate)) {
      return candidate;
    }
  }
  throw new Error('All VPN IP addresses in the 10.8.0.0/24 subnet pool are allocated.');
}

/**
 * Get all profiles with optional search and filters
 */
export async function getProfiles(filters?: {
  department?: string;
  status?: string;
  search?: string;
}): Promise<UiVpnProfile[]> {
  const where: any = {};

  if (filters?.department && filters.department !== 'all') {
    where.department = { equals: filters.department };
  }

  if (filters?.status && filters.status !== 'all') {
    const s = filters.status.toUpperCase();
    if (s === 'ACTIVE') where.status = 'ACTIVE';
    else if (s === 'REVOKED') where.status = 'REVOKED';
    else if (s === 'INACTIVE' || s === 'DISABLED') where.status = { in: ['DISABLED', 'INACTIVE'] };
  }

  if (filters?.search) {
    const q = filters.search.trim();
    where.OR = [
      { name: { contains: q } },
      { studentId: { contains: q } },
      { email: { contains: q } },
      { vpnIp: { contains: q } },
      { department: { contains: q } },
    ];
  }

  const profiles = await prisma.vpnProfile.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return profiles.map(formatProfileForUi);
}

/**
 * Get profile by ID
 */
export async function getProfileById(id: string, includePrivateKey = false) {
  const profile = await prisma.vpnProfile.findUnique({
    where: { id },
  });
  if (!profile) return null;

  if (includePrivateKey) {
    return profile;
  }
  return formatProfileForUi(profile);
}

/**
 * Get profile by student ID
 */
export async function getProfileByStudentId(studentId: string) {
  return await prisma.vpnProfile.findUnique({
    where: { studentId: studentId.trim().toUpperCase() },
  });
}

/**
 * Get profile by public key
 */
export async function getProfileByPublicKey(publicKey: string) {
  return await prisma.vpnProfile.findUnique({
    where: { publicKey },
  });
}

/**
 * Create a new student VPN profile in SQLite
 */
export async function createProfile(input: CreateProfileInput) {
  const vpnIp = input.vpnIp || (await allocateNextVpnIp());

  const created = await prisma.vpnProfile.create({
    data: {
      name: input.name.trim(),
      studentId: input.studentId.trim().toUpperCase(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone ? input.phone.trim() : null,
      department: input.department ? input.department.trim() : 'Computer Science',
      description: input.description ? input.description.trim() : 'Institutional Academic VPN Access',
      vpnIp,
      publicKey: input.publicKey,
      privateKey: input.privateKey || null,
      status: 'ACTIVE',
    },
  });

  await createAuditLog({
    action: 'VPN_PROFILE_CREATED',
    description: `VPN profile registered for ${created.name} (${created.studentId}) with assigned IP ${created.vpnIp}`,
    actor: input.actorAdminId || 'ADMIN',
    targetType: 'VPN_PROFILE',
    targetId: created.id,
    metadata: {
      studentId: created.studentId,
      department: created.department,
      vpnIp: created.vpnIp,
      severity: 'success',
    },
  });

  return formatProfileForUi(created);
}

/**
 * Update an existing profile
 */
export async function updateProfile(id: string, input: UpdateProfileInput) {
  const existing = await prisma.vpnProfile.findUnique({ where: { id } });
  if (!existing) return null;

  const data: any = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.fullName !== undefined) data.name = input.fullName;
  if (input.department !== undefined) data.department = input.department;
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status.toUpperCase();
  if (input.bytesReceived !== undefined) data.bytesReceived = BigInt(input.bytesReceived);
  if (input.bytesSent !== undefined) data.bytesSent = BigInt(input.bytesSent);
  if (input.lastHandshake !== undefined) {
    data.lastHandshake = input.lastHandshake ? new Date(input.lastHandshake) : null;
  }
  if (input.isConnected !== undefined) data.isConnected = input.isConnected;
  if (input.endpoint !== undefined) data.endpoint = input.endpoint;

  const updated = await prisma.vpnProfile.update({
    where: { id },
    data,
  });

  if (input.name || input.department || input.email) {
    await createAuditLog({
      action: 'VPN_PROFILE_UPDATED',
      description: `VPN Profile metadata updated for ${updated.name} (${updated.studentId})`,
      actor: input.actorAdminId || 'ADMIN',
      targetType: 'VPN_PROFILE',
      targetId: updated.id,
      metadata: {
        studentId: updated.studentId,
        department: updated.department,
        severity: 'info',
      },
    });
  }

  return formatProfileForUi(updated);
}

/**
 * Revoke VPN Profile
 */
export async function revokeProfile(id: string, actorAdminId?: string) {
  const existing = await prisma.vpnProfile.findUnique({ where: { id } });
  if (!existing) return null;

  const updated = await prisma.vpnProfile.update({
    where: { id },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
      isConnected: false,
    },
  });

  await createAuditLog({
    action: 'VPN_PROFILE_REVOKED',
    description: `Revoked VPN access privileges for ${updated.name} (${updated.studentId})`,
    actor: actorAdminId || 'ADMIN',
    targetType: 'VPN_PROFILE',
    targetId: updated.id,
    metadata: {
      studentId: updated.studentId,
      vpnIp: updated.vpnIp,
      severity: 'warning',
    },
  });

  return formatProfileForUi(updated);
}

/**
 * Permanently delete VPN Profile (Preserving audit logs as requested)
 */
export async function deleteProfile(id: string, actorAdminId?: string) {
  const existing = await prisma.vpnProfile.findUnique({ where: { id } });
  if (!existing) return false;

  await prisma.vpnProfile.delete({
    where: { id },
  });

  await createAuditLog({
    action: 'VPN_PROFILE_DELETED',
    description: `Permanently deleted VPN profile and deallocated IP ${existing.vpnIp} for ${existing.name} (${existing.studentId})`,
    actor: actorAdminId || 'ADMIN',
    targetType: 'VPN_PROFILE',
    targetId: existing.id,
    metadata: {
      deletedProfileName: existing.name,
      studentId: existing.studentId,
      vpnIp: existing.vpnIp,
      severity: 'error',
    },
  });

  return true;
}
