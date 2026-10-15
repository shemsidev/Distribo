import { Platform } from 'react-native';

import { config } from '@/constants/config';
import { tokenStorage } from '@/services/auth/tokenStorage';
import type { AuthResponse } from '@/types/api';

import { ApiError, NetworkError } from './errors';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** false për endpoint-et publike (login, register, refresh). */
  auth?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const isWeb = Platform.OS === 'web';

let sessionExpiredHandler: (() => void) | null = null;
let refreshInFlight: Promise<boolean> | null = null;

/** Përdoruesi i kthyer nga refresh-i i fundit (për rikthimin e sesionit në nisje). */
export let lastRefreshedUser: AuthResponse['user'] | null = null;

/** Thirret kur sesioni nuk rinovohet dot (refresh token i skaduar/revokuar). */
export function onSessionExpired(handler: () => void): () => void {
  sessionExpiredHandler = handler;
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = null;
  };
}

/** Ruan token-at e një sesioni të ri (login, register, refresh). */
export async function storeSession(session: AuthResponse): Promise<void> {
  tokenStorage.setAccessToken(session.accessToken);
  if (session.refreshToken) await tokenStorage.setRefreshToken(session.refreshToken);
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${config.apiUrl}${path}`;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `${url}?${params.join('&')}` : url;
}

async function rawFetch(path: string, options: RequestOptions, accessToken: string | null): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('timeout'), options.timeoutMs ?? config.requestTimeoutMs);
  const onAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener('abort', onAbort);

  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (isWeb) headers['X-Client-Type'] = 'web';

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      // Në web, cookie-t e refresh dërgohen vetëm te /api/auth (path i cookie-t).
      credentials: isWeb ? 'include' : 'omit',
    });
  } catch (e) {
    if (options.signal?.aborted) throw e;
    if (controller.signal.aborted) throw new NetworkError('timeout');
    throw new NetworkError('unreachable');
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let body: { title?: string; code?: string; errors?: Record<string, string[]> } = {};
  try {
    body = await res.json();
  } catch {
    // Përgjigje pa JSON (p.sh. proxy); përdor statusin.
  }
  return new ApiError(res.status, body.code ?? `http_${res.status}`, body.title ?? `HTTP ${res.status}`, body.errors ?? {});
}

/**
 * Rinovon access token-in. Disa kërkesa që marrin 401 njëkohësisht presin të njëjtin rinovim
 * (një kërkesë e vetme refresh), sepse refresh token-i rrotullohet dhe mund të përdoret vetëm një herë.
 */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!isWeb && !refreshToken) return false;
      const res = await rawFetch('/api/auth/refresh', { method: 'POST', body: { refreshToken: refreshToken ?? '' } }, null);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) await tokenStorage.clear();
        return false;
      }
      const session = (await res.json()) as AuthResponse;
      await storeSession(session);
      lastRefreshedUser = session.user;
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth ?? true;
  let res = await rawFetch(path, options, auth ? tokenStorage.getAccessToken() : null);

  if (res.status === 401 && auth) {
    const refreshed = await refreshSession();
    if (!refreshed) {
      sessionExpiredHandler?.();
      throw await parseError(res);
    }
    res = await rawFetch(path, options, tokenStorage.getAccessToken());
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
