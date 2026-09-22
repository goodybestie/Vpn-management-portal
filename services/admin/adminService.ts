/**
 * Foundation Polytechnic, Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria
 * Administrator & Session Service Layer
 */

import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { AdminUser, AdminUserSafe, AdminSession as UiAdminSession } from '../../src/types';

/**
 * Find administrator by email (case-insensitive)
 */
export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  if (!email) return null;
  const admin = await prisma.admin.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!admin) return null;

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    passwordHash: admin.passwordHash,
    role: admin.role as any,
    createdAt: admin.createdAt.toISOString(),
    updatedAt: admin.updatedAt.toISOString(),
  };
}

/**
 * Find administrator by ID
 */
export async function getAdminById(id: string): Promise<AdminUser | null> {
  if (!id) return null;
  const admin = await prisma.admin.findUnique({
    where: { id },
  });
  if (!admin) return null;

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    passwordHash: admin.passwordHash,
    role: admin.role as any,
    createdAt: admin.createdAt.toISOString(),
    updatedAt: admin.updatedAt.toISOString(),
  };
}

/**
 * Get all administrators with sensitive passwordHash excluded
 */
export async function getAdmins(): Promise<AdminUserSafe[]> {
  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return admins.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    role: a.role as any,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));
}

/**
 * Create a new cryptographically secure admin session
 */
export async function createAdminSession(
  admin: AdminUser,
  reqInfo?: { ipAddress?: string; userAgent?: string }
): Promise<UiAdminSession> {
  // Generate 64-char cryptographically secure token
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = new Date(now + 8 * 3600 * 1000); // 8 hours duration

  // Delete expired sessions from database
  try {
    await prisma.adminSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  } catch {
    // Ignore cleanup error
  }

  const session = await prisma.adminSession.create({
    data: {
      id: token,
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      expiresAt,
      ipAddress: reqInfo?.ipAddress || null,
      userAgent: reqInfo?.userAgent || null,
    },
  });

  return {
    id: session.id,
    adminId: session.adminId,
    email: session.email,
    name: session.name,
    role: session.role as any,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    ipAddress: session.ipAddress || undefined,
    userAgent: session.userAgent || undefined,
  };
}

/**
 * Retrieve active session by token
 */
export async function getAdminSession(token: string): Promise<UiAdminSession | null> {
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { id: token },
  });

  if (!session) return null;

  // Check if expired
  if (session.expiresAt.getTime() <= Date.now()) {
    try {
      await prisma.adminSession.delete({ where: { id: token } });
    } catch {
      // Ignore
    }
    return null;
  }

  return {
    id: session.id,
    adminId: session.adminId,
    email: session.email,
    name: session.name,
    role: session.role as any,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    ipAddress: session.ipAddress || undefined,
    userAgent: session.userAgent || undefined,
  };
}

/**
 * Delete session on logout
 */
export async function deleteAdminSession(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    await prisma.adminSession.delete({
      where: { id: token },
    });
    return true;
  } catch {
    return false;
  }
}
