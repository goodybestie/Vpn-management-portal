import {
  VpnProfile,
  ServerStatus,
  AuditLog,
  TrafficSnapshot,
  AdminUserSafe,
  TrafficResponse,
  PaginatedAuditLogsResponse,
} from '../types';

export type { TrafficResponse, PaginatedAuditLogsResponse };

export interface DiagnosticsResponse {
  isWindows: boolean;
  platform: string;
  arch: string;
  nodeVersion: string;
  wireGuardService: string;
  isSimulation: boolean;
  wireGuardCheck: {
    installed: boolean;
    path: string;
    version?: string;
    details: string;
  };
  settings: {
    interfaceName: string;
    serverAddress: string;
    listeningPort: number;
    serverEndpoint: string;
    dns: string;
  };
}

/**
 * Universal authenticated API fetch wrapper
 * Ensures credentials: "include" are present on all browser requests (for session cookies)
 * and attaches Authorization: Bearer <token> fallback when stored in sessionStorage.
 */
async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (typeof sessionStorage !== 'undefined') {
    const token = sessionStorage.getItem('fp_vpn_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });
}

export async function fetchServerStatus(): Promise<ServerStatus> {
  const res = await apiFetch('/api/vpn/status');
  if (!res.ok) throw new Error('Failed to fetch VPN server status');
  return res.json();
}

export async function startVpnServer(): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch('/api/vpn/start', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to start VPN server');
  return data;
}

export async function stopVpnServer(): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch('/api/vpn/stop', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to stop VPN server');
  return data;
}

export async function restartVpnServer(): Promise<{ success: boolean; message: string }> {
  const res = await apiFetch('/api/vpn/restart', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to restart VPN server');
  return data;
}

export async function fetchProfiles(params?: {
  department?: string;
  status?: string;
  search?: string;
}): Promise<VpnProfile[]> {
  const query = new URLSearchParams();
  if (params?.department) query.set('department', params.department);
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);

  const res = await apiFetch(`/api/profiles?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch VPN profiles');
  return res.json();
}

export async function createProfile(data: {
  fullName: string;
  studentId: string;
  department: string;
  email: string;
  phone?: string;
  description?: string;
}): Promise<{ profile: VpnProfile; clientPrivateKey: string; message: string }> {
  const res = await apiFetch('/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create VPN profile');
  return json;
}

export async function updateProfile(
  id: string,
  data: Partial<VpnProfile>
): Promise<VpnProfile> {
  const res = await apiFetch(`/api/profiles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update VPN profile');
  return json;
}

export async function revokeProfile(id: string): Promise<{ success: boolean; profile: VpnProfile }> {
  const res = await apiFetch(`/api/profiles/${id}/revoke`, { method: 'POST' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to revoke VPN profile');
  return json;
}

export async function activateProfile(id: string): Promise<{ success: boolean; profile: VpnProfile }> {
  const res = await apiFetch(`/api/profiles/${id}/activate`, { method: 'POST' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to activate VPN profile');
  return json;
}

export async function deleteProfile(id: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`/api/profiles/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete VPN profile');
  return json;
}

export async function fetchProfileConfig(id: string): Promise<{ confContent: string; filename: string }> {
  const res = await apiFetch(`/api/profiles/${id}/config?format=json`, {
    headers: { Accept: 'application/json, text/plain, */*' },
  });
  if (!res.ok) {
    const errorText = await res.text();
    let errorMsg = 'Failed to fetch configuration';
    try {
      const errJson = JSON.parse(errorText);
      if (errJson.error) errorMsg = errJson.error;
    } catch {
      if (errorText) errorMsg = errorText;
    }
    throw new Error(errorMsg);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  } else {
    const confContent = await res.text();
    const disposition = res.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `FoundationPoly_VPN_${id}.conf`;
    return { confContent, filename };
  }
}

export async function fetchProfileQr(id: string): Promise<{ qrDataUrl: string; confContent: string }> {
  const res = await apiFetch(`/api/profiles/${id}/qr`);
  if (!res.ok) throw new Error('Failed to generate QR code');
  return res.json();
}

export async function fetchConnectedClients(): Promise<VpnProfile[]> {
  const res = await apiFetch('/api/vpn/clients');
  if (!res.ok) throw new Error('Failed to fetch connected clients');
  return res.json();
}

export async function fetchTrafficData(params?: {
  profileId?: string;
  from?: string;
  to?: string;
}): Promise<TrafficResponse> {
  const query = new URLSearchParams();
  if (params?.profileId) query.set('profileId', params.profileId);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  const qs = query.toString();
  const res = await apiFetch(`/api/traffic${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch traffic metrics');
  return res.json();
}

export interface AuditLogFilterOptions {
  action?: string;
  actor?: string;
  targetType?: string;
  targetId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
  eventType?: string;
  profileId?: string;
  severity?: string;
}

export async function fetchAuditLogsPaginated(
  params?: AuditLogFilterOptions
): Promise<PaginatedAuditLogsResponse> {
  const query = new URLSearchParams();
  if (params?.action && params.action !== 'all') query.set('action', params.action);
  if (params?.actor && params.actor !== 'all') query.set('actor', params.actor);
  if (params?.targetType && params.targetType !== 'all') query.set('targetType', params.targetType);
  if (params?.targetId && params.targetId !== 'all') query.set('targetId', params.targetId);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.eventType && params.eventType !== 'all') query.set('eventType', params.eventType);
  if (params?.profileId && params.profileId !== 'all') query.set('profileId', params.profileId);
  if (params?.severity && params.severity !== 'all') query.set('severity', params.severity);

  const res = await apiFetch(`/api/audit-logs?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  const data = await res.json();
  if (Array.isArray(data)) {
    return {
      logs: data,
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
    };
  }
  return data;
}

export async function fetchAuditLogs(params?: AuditLogFilterOptions): Promise<AuditLog[]> {
  const data = await fetchAuditLogsPaginated(params);
  return data.logs;
}

export async function fetchDiagnostics(): Promise<DiagnosticsResponse> {
  const res = await apiFetch('/api/system/diagnostics');
  if (!res.ok) throw new Error('Failed to fetch system diagnostics');
  return res.json();
}

export async function switchMode(mode: 'real' | 'mock'): Promise<{ currentService: string; isSimulation: boolean }> {
  const res = await apiFetch('/api/system/mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  return res.json();
}

// ==========================================
// ADMINISTRATOR AUTHENTICATION CLIENT APIS
// ==========================================

export async function loginAdmin(credentials: {
  email: string;
  password: string;
}): Promise<{ authenticated: boolean; admin: AdminUserSafe; token?: string; status: number }> {
  if (typeof window !== 'undefined') {
    console.log('[Auth Client] Initiating POST /api/auth/login:', {
      url: '/api/auth/login',
      method: 'POST',
      email: credentials.email,
      origin: window.location.origin,
      hasSessionStorageToken: !!sessionStorage.getItem('fp_vpn_token'),
    });
  }

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });

  const data = await res.json().catch(() => ({ error: 'Invalid server response' }));

  if (typeof window !== 'undefined') {
    console.log('[Auth Client] Response from /api/auth/login:', {
      httpStatus: res.status,
      authenticated: data?.authenticated,
      role: data?.admin?.role,
    });
  }

  if (!res.ok) {
    const err = new Error(data.error || 'Invalid email or password.') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (data.token && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem('fp_vpn_token', data.token);
    } catch {}
  }

  return {
    ...data,
    status: res.status,
  };
}

export async function getCurrentAdmin(): Promise<{
  authenticated: boolean;
  admin: AdminUserSafe | null;
}> {
  try {
    const headers = new Headers();
    if (typeof sessionStorage !== 'undefined') {
      const token = sessionStorage.getItem('fp_vpn_token');
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    if (!res.ok) {
      return { authenticated: false, admin: null };
    }
    const data = await res.json();

    if (typeof window !== 'undefined') {
      console.log('[Auth Client] /api/auth/me session status:', {
        httpStatus: res.status,
        authenticated: data.authenticated,
        role: data.admin?.role,
      });
    }

    return data;
  } catch {
    return { authenticated: false, admin: null };
  }
}

export async function logoutAdmin(): Promise<{ success: boolean; message: string }> {
  try {
    const headers = new Headers();
    if (typeof sessionStorage !== 'undefined') {
      const token = sessionStorage.getItem('fp_vpn_token');
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers,
    });
    const data = await res.json().catch(() => ({ success: true, message: 'Logged out' }));
    return data;
  } finally {
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem('fp_vpn_token');
      } catch {}
    }
  }
}
