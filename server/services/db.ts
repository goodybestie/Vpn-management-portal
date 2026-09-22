/**
 * Foundation Polytechnic, Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria
 * Database Service Layer - SQLite & Prisma ORM Integrated
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import {
  VpnProfile,
  AuditLog,
  TrafficSnapshot,
  AuditEventType,
  AuditSeverity,
  AdminUser,
  AdminUserSafe,
  AdminSession,
} from '../../src/types';
import { generateWireGuardKeyPair } from './crypto';

interface DatabaseSchema {
  admins: AdminUser[];
  sessions: AdminSession[];
  profiles: VpnProfile[];
  auditLogs: AuditLog[];
  trafficSnapshots: TrafficSnapshot[];
  settings: {
    interfaceName: string;
    serverAddress: string;
    listeningPort: number;
    serverEndpoint: string;
    dns: string;
  };
}

class DatabaseService {
  private data: DatabaseSchema;
  private isInitialized = false;
  private profilePrivateKeys: Map<string, string> = new Map();

  constructor() {
    this.data = {
      admins: [],
      sessions: [],
      profiles: [],
      auditLogs: [],
      trafficSnapshots: [],
      settings: {
        interfaceName: process.env.WG_INTERFACE || 'wg0',
        serverAddress: process.env.WG_SERVER_ADDRESS || '10.8.0.1/24',
        listeningPort: parseInt(process.env.WG_SERVER_PORT || '51820', 10),
        serverEndpoint: process.env.WG_SERVER_ENDPOINT || 'vpn.foundationpoly.edu.ng:51820',
        dns: process.env.WG_CLIENT_DNS || '10.8.0.1, 1.1.1.1',
      },
    };

    // Hydrate in-memory sync cache from SQLite database via Prisma
    this.syncFromPrisma().catch((err) => {
      console.error('[DatabaseService] Failed initial sync from SQLite:', err);
    });
  }

  /**
   * Hydrate memory state from SQLite database
   */
  public async syncFromPrisma() {
    try {
      // 1. Sync Admins
      let dbAdmins = await prisma.admin.findMany();
      if (dbAdmins.length === 0) {
        await this.seedInitialAdmin();
        dbAdmins = await prisma.admin.findMany();
      } else {
        // Idempotently verify configured admin credentials if ADMIN_PASSWORD is set in environment
        const targetEmail = (process.env.ADMIN_EMAIL || 'admin@foundationpoly.edu.ng').toLowerCase().trim();
        const configuredAdmin = dbAdmins.find((a) => a.email.toLowerCase().trim() === targetEmail);
        if (configuredAdmin && process.env.ADMIN_PASSWORD) {
          const isCurrentHashValid = bcrypt.compareSync(process.env.ADMIN_PASSWORD, configuredAdmin.passwordHash);
          if (!isCurrentHashValid) {
            const updatedHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
            await prisma.admin
              .update({
                where: { id: configuredAdmin.id },
                data: {
                  email: targetEmail,
                  passwordHash: updatedHash,
                  role: 'ADMIN',
                  updatedAt: new Date(),
                },
              })
              .catch(() => {});
            configuredAdmin.passwordHash = updatedHash;
            configuredAdmin.role = 'ADMIN';
          }
        }
      }

      this.data.admins = dbAdmins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        passwordHash: a.passwordHash,
        role: a.role as any,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));

      // 2. Sync Active Sessions
      const dbSessions = await prisma.adminSession.findMany({
        where: { expiresAt: { gt: new Date() } },
      });
      this.data.sessions = dbSessions.map((s) => ({
        id: s.id,
        adminId: s.adminId,
        email: s.email,
        name: s.name,
        role: s.role as any,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        ipAddress: s.ipAddress || undefined,
        userAgent: s.userAgent || undefined,
      }));

      // 3. Sync VPN Profiles
      const dbProfiles = await prisma.vpnProfile.findMany({
        orderBy: { createdAt: 'desc' },
      });
      for (const p of dbProfiles) {
        if (p.privateKey) {
          this.profilePrivateKeys.set(p.id, p.privateKey);
        } else {
          // Generate a valid Curve25519 private key for legacy/seed profiles lacking one
          const generatedKey = generateWireGuardKeyPair().privateKey;
          this.profilePrivateKeys.set(p.id, generatedKey);
          prisma.vpnProfile
            .update({
              where: { id: p.id },
              data: { privateKey: generatedKey },
            })
            .catch(() => {});
        }
      }
      this.data.profiles = dbProfiles.map((p) => ({
        id: p.id,
        fullName: p.name,
        studentId: p.studentId,
        department: p.department || 'General Studies',
        email: p.email,
        phone: p.phone || '',
        description: p.description || undefined,
        vpnIp: p.vpnIp,
        publicKey: p.publicKey,
        status: p.status.toLowerCase() as any,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        lastHandshake: p.lastHandshake ? p.lastHandshake.toISOString() : null,
        bytesReceived: Number(p.bytesReceived),
        bytesSent: Number(p.bytesSent),
        isConnected: p.isConnected,
        endpoint: p.endpoint || undefined,
      }));

      // 4. Sync Audit Logs
      const dbAuditLogs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      this.data.auditLogs = dbAuditLogs.map((l) => {
        let meta: Record<string, unknown> = {};
        if (l.metadata) {
          try {
            meta = JSON.parse(l.metadata);
          } catch {
            meta = {};
          }
        }
        return {
          id: l.id,
          timestamp: l.createdAt.toISOString(),
          eventType: (l.action.toLowerCase() as any) || 'config_changed',
          profileId: l.targetId || undefined,
          profileName: (meta.profileName as string) || undefined,
          adminEmail: (meta.adminEmail as string) || l.actor || undefined,
          description: l.description,
          ipAddress: (meta.ipAddress as string) || undefined,
          severity: (meta.severity as any) || 'info',
          metadata: meta,
        };
      });

      // 5. Sync Traffic Snapshots
      const dbSnapshots = await prisma.trafficSnapshot.findMany({
        include: { vpnProfile: true },
        orderBy: { timestamp: 'desc' },
        take: 50,
      });
      this.data.trafficSnapshots = dbSnapshots.map((s) => ({
        id: s.id,
        profileId: s.vpnProfileId,
        profileName: s.vpnProfile?.name || 'Campus Peer',
        timestamp: s.timestamp.toISOString(),
        bytesReceived: Number(s.bytesReceived),
        bytesSent: Number(s.bytesSent),
        totalBytes: Number(s.bytesReceived + s.bytesSent),
      }));

      this.isInitialized = true;
    } catch (err) {
      console.error('[DatabaseService] Error during syncFromPrisma:', err);
    }
  }

  // --- Administrator Management ---
  public async seedInitialAdmin(): Promise<AdminUser> {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@foundationpoly.edu.ng').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Foundation@2026!';
    const passwordHash = bcrypt.hashSync(adminPassword, 10);

    const allAdmins = await prisma.admin.findMany();
    const existing = allAdmins.find(
      (a) => a.email.toLowerCase().trim() === adminEmail
    );

    let adminRecord;
    if (existing) {
      adminRecord = await prisma.admin.update({
        where: { id: existing.id },
        data: {
          email: adminEmail,
          passwordHash,
          role: 'ADMIN',
          updatedAt: new Date(),
        },
      });
    } else {
      adminRecord = await prisma.admin.create({
        data: {
          name: 'System Administrator',
          email: adminEmail,
          passwordHash,
          role: 'ADMIN',
        },
      });
    }

    const adminUser: AdminUser = {
      id: adminRecord.id,
      name: adminRecord.name,
      email: adminRecord.email,
      passwordHash: adminRecord.passwordHash,
      role: adminRecord.role as any,
      createdAt: adminRecord.createdAt.toISOString(),
      updatedAt: adminRecord.updatedAt.toISOString(),
    };

    const existingIdx = this.data.admins.findIndex((a) => a.email.toLowerCase().trim() === adminEmail);
    if (existingIdx >= 0) {
      this.data.admins[existingIdx] = adminUser;
    } else {
      this.data.admins.push(adminUser);
    }

    return adminUser;
  }

  public getAdmins(): AdminUserSafe[] {
    return (this.data.admins || []).map(({ passwordHash: _, ...safe }) => safe);
  }

  public getAdminByEmail(email: string): AdminUser | undefined {
    return (this.data.admins || []).find(
      (a) => a.email.toLowerCase().trim() === email.toLowerCase().trim()
    );
  }

  public async getAdminByEmailAsync(email: string): Promise<AdminUser | undefined> {
    const normalized = email.toLowerCase().trim();
    const inMemory = this.getAdminByEmail(normalized);
    if (inMemory) return inMemory;

    try {
      const allAdmins = await prisma.admin.findMany();
      const dbAdmin = allAdmins.find((a) => a.email.toLowerCase().trim() === normalized);
      if (dbAdmin) {
        const adminUser: AdminUser = {
          id: dbAdmin.id,
          name: dbAdmin.name,
          email: dbAdmin.email,
          passwordHash: dbAdmin.passwordHash,
          role: dbAdmin.role as any,
          createdAt: dbAdmin.createdAt.toISOString(),
          updatedAt: dbAdmin.updatedAt.toISOString(),
        };
        const idx = this.data.admins.findIndex((a) => a.id === adminUser.id || a.email.toLowerCase().trim() === normalized);
        if (idx >= 0) {
          this.data.admins[idx] = adminUser;
        } else {
          this.data.admins.push(adminUser);
        }
        return adminUser;
      }
    } catch {
      // Ignore
    }
    return undefined;
  }

  public getAdminById(id: string): AdminUser | undefined {
    return (this.data.admins || []).find((a) => a.id === id);
  }

  // --- Session Management ---
  public createSession(
    admin: AdminUser,
    reqInfo?: { ipAddress?: string; userAgent?: string }
  ): AdminSession {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = new Date(now + 8 * 3600 * 1000);

    const session: AdminSession = {
      id: token,
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      ipAddress: reqInfo?.ipAddress,
      userAgent: reqInfo?.userAgent,
    };

    this.data.sessions.push(session);

    // Asynchronously persist to SQLite via Prisma
    prisma.adminSession
      .create({
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
      })
      .catch((err) => console.error('[DatabaseService] Failed to persist session to SQLite:', err));

    return session;
  }

  public getSession(token: string): AdminSession | null {
    if (!token) return null;
    const now = Date.now();
    const session = this.data.sessions.find(
      (s) => s.id === token && new Date(s.expiresAt).getTime() > now
    );
    return session || null;
  }

  public async getSessionAsync(token: string): Promise<AdminSession | null> {
    const memorySession = this.getSession(token);
    if (memorySession) return memorySession;

    try {
      const dbSession = await prisma.adminSession.findUnique({
        where: { id: token },
      });
      if (dbSession && dbSession.expiresAt.getTime() > Date.now()) {
        const session: AdminSession = {
          id: dbSession.id,
          adminId: dbSession.adminId,
          email: dbSession.email,
          name: dbSession.name,
          role: dbSession.role as any,
          createdAt: dbSession.createdAt.toISOString(),
          expiresAt: dbSession.expiresAt.toISOString(),
          ipAddress: dbSession.ipAddress || undefined,
          userAgent: dbSession.userAgent || undefined,
        };
        this.data.sessions.push(session);
        return session;
      }
    } catch {
      // Ignore
    }
    return null;
  }

  public deleteSession(token: string): boolean {
    if (!token) return false;
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => s.id !== token);

    // Delete from SQLite
    prisma.adminSession
      .delete({ where: { id: token } })
      .catch(() => {
        // Ignore deletion if not present
      });

    return this.data.sessions.length !== initialLen;
  }

  // --- Profile Methods ---
  public getProfiles(): VpnProfile[] {
    return this.data.profiles;
  }

  public getProfileById(id: string): VpnProfile | undefined {
    return this.data.profiles.find((p) => p.id === id);
  }

  public getProfileByPublicKey(pubKey: string): VpnProfile | undefined {
    return this.data.profiles.find((p) => p.publicKey === pubKey);
  }

  public getProfileByStudentId(studentId: string): VpnProfile | undefined {
    return this.data.profiles.find(
      (p) => p.studentId.trim().toLowerCase() === studentId.trim().toLowerCase()
    );
  }

  public createProfile(profile: VpnProfile, privateKey?: string): VpnProfile {
    this.data.profiles.unshift(profile);
    const key = privateKey || generateWireGuardKeyPair().privateKey;
    this.profilePrivateKeys.set(profile.id, key);

    // Persist to SQLite
    prisma.vpnProfile
      .create({
        data: {
          id: profile.id,
          name: profile.fullName,
          studentId: profile.studentId,
          email: profile.email,
          phone: profile.phone || null,
          department: profile.department,
          description: profile.description || null,
          vpnIp: profile.vpnIp,
          publicKey: profile.publicKey,
          privateKey: key,
          status: profile.status.toUpperCase(),
          isConnected: profile.isConnected,
          endpoint: profile.endpoint || null,
        },
      })
      .catch((err) => console.error('[DatabaseService] Failed to insert profile into SQLite:', err));

    return profile;
  }

  public updateProfile(id: string, updates: Partial<VpnProfile>): VpnProfile | undefined {
    const idx = this.data.profiles.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;

    this.data.profiles[idx] = {
      ...this.data.profiles[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const current = this.data.profiles[idx];

    // Asynchronously update SQLite
    const updateData: any = {};
    if (updates.fullName !== undefined) updateData.name = updates.fullName;
    if (updates.department !== undefined) updateData.department = updates.department;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status.toUpperCase();
    if (updates.bytesReceived !== undefined) updateData.bytesReceived = BigInt(updates.bytesReceived);
    if (updates.bytesSent !== undefined) updateData.bytesSent = BigInt(updates.bytesSent);
    if (updates.lastHandshake !== undefined) {
      updateData.lastHandshake = updates.lastHandshake ? new Date(updates.lastHandshake) : null;
    }
    if (updates.isConnected !== undefined) updateData.isConnected = updates.isConnected;
    if (updates.endpoint !== undefined) updateData.endpoint = updates.endpoint;

    prisma.vpnProfile
      .update({
        where: { id },
        data: updateData,
      })
      .catch((err) => console.error('[DatabaseService] Failed to update profile in SQLite:', err));

    return current;
  }

  public deleteProfile(id: string): boolean {
    this.profilePrivateKeys.delete(id);
    const initialLen = this.data.profiles.length;
    this.data.profiles = this.data.profiles.filter((p) => p.id !== id);

    // Delete from SQLite
    prisma.vpnProfile
      .delete({ where: { id } })
      .catch((err) => console.error('[DatabaseService] Failed to delete profile from SQLite:', err));

    return this.data.profiles.length !== initialLen;
  }

  public getProfilePrivateKey(id: string): string | undefined {
    let key = this.profilePrivateKeys.get(id);
    if (!key) {
      const generated = generateWireGuardKeyPair().privateKey;
      this.profilePrivateKeys.set(id, generated);
      prisma.vpnProfile
        .update({
          where: { id },
          data: { privateKey: generated },
        })
        .catch(() => {});
      key = generated;
    }
    return key;
  }

  public allocateNextVpnIp(): string {
    const usedIps = new Set(this.data.profiles.map((p) => p.vpnIp));
    for (let i = 2; i <= 254; i++) {
      const candidate = `10.8.0.${i}`;
      if (!usedIps.has(candidate)) {
        return candidate;
      }
    }
    throw new Error('All VPN IP addresses in the 10.8.0.0/24 pool are currently allocated.');
  }

  // --- Audit Log Methods ---
  public getAuditLogs(filters?: {
    eventType?: string;
    profileId?: string;
    severity?: string;
    search?: string;
  }): AuditLog[] {
    let logs = [...this.data.auditLogs];

    if (filters?.eventType && filters.eventType !== 'all') {
      logs = logs.filter((l) => l.eventType === filters.eventType);
    }
    if (filters?.profileId && filters.profileId !== 'all') {
      logs = logs.filter((l) => l.profileId === filters.profileId);
    }
    if (filters?.severity && filters.severity !== 'all') {
      logs = logs.filter((l) => l.severity === filters.severity);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.description.toLowerCase().includes(q) ||
          l.profileName?.toLowerCase().includes(q) ||
          l.ipAddress?.toLowerCase().includes(q)
      );
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addAuditLog(entry: {
    eventType: AuditEventType;
    profileId?: string;
    profileName?: string;
    adminEmail?: string;
    description: string;
    ipAddress?: string;
    severity: AuditSeverity;
    metadata?: Record<string, unknown>;
  }): AuditLog {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.data.auditLogs.unshift(newLog);
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }

    return newLog;
  }

  // --- Traffic Snapshots ---
  public recordTrafficSnapshot(snapshot: Omit<TrafficSnapshot, 'id'>) {
    const item: TrafficSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...snapshot,
    };
    this.data.trafficSnapshots.unshift(item);
    if (this.data.trafficSnapshots.length > 500) {
      this.data.trafficSnapshots = this.data.trafficSnapshots.slice(0, 500);
    }

    // If matches a real profile id, persist to SQLite
    if (snapshot.profileId && snapshot.profileId.startsWith('prof-')) {
      prisma.trafficSnapshot
        .create({
          data: {
            vpnProfileId: snapshot.profileId,
            bytesReceived: BigInt(snapshot.bytesReceived),
            bytesSent: BigInt(snapshot.bytesSent),
            timestamp: new Date(snapshot.timestamp),
          },
        })
        .catch(() => {
          // Ignore if profile doesn't exist yet
        });
    }
  }

  public getTrafficSnapshots(limit = 50): TrafficSnapshot[] {
    return this.data.trafficSnapshots.slice(0, limit);
  }

  // --- Settings ---
  public getSettings() {
    return this.data.settings;
  }

  public updateSettings(settings: Partial<DatabaseSchema['settings']>) {
    this.data.settings = { ...this.data.settings, ...settings };
    return this.data.settings;
  }
}

export const dbService = new DatabaseService();
