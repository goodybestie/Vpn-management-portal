/**
 * Foundation Polytechnic, Ikot Edem, Ikot Ekpene, Akwa Ibom State, Nigeria
 * Audit Logging Service Layer
 */

import { prisma } from '../../lib/prisma';
import { dbService } from '../../server/services/db';
import {
  AuditLog as UiAuditLog,
  AuditEventType,
  AuditSeverity,
  PaginatedAuditLogsResponse,
} from '../../src/types';

export interface CreateAuditLogParams {
  action: string;
  description: string;
  actor?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | string | null;
}

export interface AuditLogFilterParams {
  action?: string;
  actor?: string;
  targetType?: string;
  targetId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
  offset?: number;
  // Backward compatibility filter names
  eventType?: string;
  profileId?: string;
  severity?: string;
}

/**
 * Strips all confidential and secret fields from metadata objects
 * (WireGuard private keys, administrator passwords, password hashes, session tokens).
 */
export function sanitizeAuditMetadata(data: unknown): Record<string, unknown> | null {
  if (!data) return null;
  if (typeof data !== 'object') return { value: String(data) };

  const clean: Record<string, unknown> = {};
  const forbiddenKeys = new Set([
    'password',
    'passwordhash',
    'privatekey',
    'clientprivatekey',
    'serverprivatekey',
    'sessiontoken',
    'token',
    'secret',
    'confcontent',
    'fullconfig',
  ]);

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (forbiddenKeys.has(lowerKey)) {
      continue; // NEVER serialize or store sensitive secrets
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      clean[key] = sanitizeAuditMetadata(value);
    } else {
      clean[key] = value;
    }
  }

  return clean;
}

/**
 * Reusable server-side helper for creating audit logs in SQLite via Prisma.
 * Ensures security: strips sensitive secrets before saving.
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  let serializedMetadata: string | null = null;
  let cleanMeta: Record<string, unknown> | null = null;

  if (params.metadata) {
    if (typeof params.metadata === 'string') {
      try {
        const parsed = JSON.parse(params.metadata);
        cleanMeta = sanitizeAuditMetadata(parsed);
        serializedMetadata = cleanMeta ? JSON.stringify(cleanMeta) : null;
      } catch {
        serializedMetadata = null; // Do not store raw unparsed strings that might contain secrets
      }
    } else {
      cleanMeta = sanitizeAuditMetadata(params.metadata);
      serializedMetadata = cleanMeta ? JSON.stringify(cleanMeta) : null;
    }
  }

  const created = await prisma.auditLog.create({
    data: {
      action: params.action,
      description: params.description,
      actor: params.actor || 'SYSTEM',
      targetType: params.targetType || null,
      targetId: params.targetId || null,
      metadata: serializedMetadata,
    },
  });

  // Mirror to in-memory dbService for backward compatibility with legacy views
  const uiLog = mapAuditLogToUi(created);
  dbService.addAuditLog({
    eventType: uiLog.eventType,
    profileId: uiLog.profileId,
    profileName: uiLog.profileName,
    adminEmail: uiLog.adminEmail,
    description: uiLog.description,
    ipAddress: uiLog.ipAddress,
    severity: uiLog.severity,
    metadata: cleanMeta || undefined,
  });

  return created;
}

/**
 * Map Prisma AuditLog database record to frontend-compatible UI representation
 */
export function mapAuditLogToUi(log: {
  id: string;
  action: string;
  description: string;
  actor: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: string | null;
  createdAt: Date;
}): UiAuditLog {
  let parsedMeta: Record<string, unknown> = {};
  if (log.metadata) {
    try {
      parsedMeta = JSON.parse(log.metadata);
    } catch {
      parsedMeta = {};
    }
  }

  // Ensure metadata is sanitized
  const cleanMeta = sanitizeAuditMetadata(parsedMeta) || {};

  // Derive legacy eventType & severity for existing UI compatibility
  const actionUpper = log.action.toUpperCase();
  let eventType: AuditEventType = 'config_changed';
  if (actionUpper === 'ADMIN_LOGIN_SUCCESS') eventType = 'admin_login_success';
  else if (actionUpper === 'ADMIN_LOGIN_FAILED') eventType = 'admin_login_failed';
  else if (actionUpper === 'ADMIN_LOGOUT') eventType = 'admin_logout';
  else if (actionUpper === 'VPN_PROFILE_CREATED') eventType = 'profile_created';
  else if (actionUpper === 'VPN_PROFILE_UPDATED') eventType = 'profile_updated';
  else if (actionUpper === 'VPN_PROFILE_REVOKED') eventType = 'profile_revoked';
  else if (actionUpper === 'VPN_PROFILE_DELETED') eventType = 'profile_deleted';
  else if (actionUpper === 'VPN_CLIENT_CONNECTED') eventType = 'client_connected';
  else if (actionUpper === 'VPN_CLIENT_DISCONNECTED') eventType = 'client_disconnected';
  else if (actionUpper === 'VPN_CONFIG_GENERATED') eventType = 'config_generated';
  else if (actionUpper === 'VPN_SERVER_STARTED') eventType = 'server_started';
  else if (actionUpper === 'VPN_SERVER_STOPPED') eventType = 'server_stopped';
  else if (actionUpper === 'VPN_SERVER_RESTARTED') eventType = 'server_restarted';
  else if (actionUpper.includes('FAILED') || actionUpper.includes('DENIED')) eventType = 'permission_denied';

  let severity: AuditSeverity = (cleanMeta.severity as AuditSeverity) || 'info';
  if (!cleanMeta.severity) {
    if (
      actionUpper.includes('FAILED') ||
      actionUpper.includes('DELETED') ||
      actionUpper.includes('DENIED')
    ) {
      severity = 'error';
    } else if (actionUpper.includes('REVOKED') || actionUpper.includes('STOPPED')) {
      severity = 'warning';
    } else if (
      actionUpper.includes('SUCCESS') ||
      actionUpper.includes('CONNECTED') ||
      actionUpper.includes('CREATED')
    ) {
      severity = 'success';
    }
  }

  const actorStr = log.actor || 'SYSTEM';

  return {
    id: log.id,
    action: log.action,
    description: log.description,
    actor: actorStr,
    targetType: log.targetType || null,
    targetId: log.targetId || null,
    metadata: cleanMeta,
    createdAt: log.createdAt.toISOString(),
    // Backward compatibility fields
    timestamp: log.createdAt.toISOString(),
    eventType,
    profileId: log.targetId || undefined,
    profileName: (cleanMeta.profileName as string) || (cleanMeta.name as string) || undefined,
    adminEmail:
      (cleanMeta.adminEmail as string) || (actorStr.includes('@') ? actorStr : undefined),
    ipAddress:
      (cleanMeta.ipAddress as string) ||
      (cleanMeta.endpoint as string) ||
      (cleanMeta.vpnIp as string) ||
      undefined,
    severity,
  };
}

/**
 * Retrieve filtered audit logs with pagination from SQLite via Prisma
 */
export async function getAuditLogs(
  filters?: AuditLogFilterParams
): Promise<PaginatedAuditLogsResponse> {
  const where: any = {};

  // Action filter
  if (filters?.action && filters.action !== 'all') {
    where.action = filters.action;
  }

  // Actor filter
  if (filters?.actor && filters.actor !== 'all') {
    where.actor = { contains: filters.actor };
  }

  // Target Type filter
  if (filters?.targetType && filters.targetType !== 'all') {
    where.targetType = filters.targetType;
  }

  // Target ID / Profile ID filter
  const effectiveTargetId = filters?.targetId || filters?.profileId;
  if (effectiveTargetId && effectiveTargetId !== 'all') {
    where.targetId = effectiveTargetId;
  }

  // Date range filtering (from / to)
  if (filters?.from || filters?.to) {
    where.createdAt = {};
    if (filters.from) {
      const fromDate = new Date(filters.from);
      if (!isNaN(fromDate.getTime())) {
        where.createdAt.gte = fromDate;
      }
    }
    if (filters.to) {
      const toDate = new Date(filters.to);
      if (!isNaN(toDate.getTime())) {
        where.createdAt.lte = toDate;
      }
    }
  }

  // Free-text search
  if (filters?.search) {
    const q = filters.search.trim();
    if (q) {
      where.OR = [
        { action: { contains: q } },
        { description: { contains: q } },
        { actor: { contains: q } },
        { targetId: { contains: q } },
        { metadata: { contains: q } },
      ];
    }
  }

  // Pagination calculations
  const limit = Math.max(1, Math.min(filters?.limit ? Number(filters.limit) : 25, 200));
  const page = Math.max(1, filters?.page ? Number(filters.page) : 1);
  const offset = filters?.offset !== undefined ? Number(filters.offset) : (page - 1) * limit;

  const [total, records] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
  ]);

  let uiLogs = records.map(mapAuditLogToUi);

  // Backward compatible in-memory filters for legacy frontend eventType/severity
  if (filters?.eventType && filters.eventType !== 'all') {
    uiLogs = uiLogs.filter((l) => l.eventType === filters.eventType);
  }
  if (filters?.severity && filters.severity !== 'all') {
    uiLogs = uiLogs.filter((l) => l.severity === filters.severity);
  }

  return {
    logs: uiLogs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

