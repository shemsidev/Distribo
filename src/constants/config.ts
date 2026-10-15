import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Konfigurimi i aplikacionit nga environment variables (EXPO_PUBLIC_*).
 * Këto vlera përfshihen në paketën e aplikacionit: mos vendos sekrete këtu.
 */

function readInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Në zhvillim, nëse EXPO_PUBLIC_API_URL nuk është vendosur, API-ja gjendet në të njëjtin kompjuter
 * që shërben Metro: telefoni përdor IP-në e kompjuterit, shfletuesi përdor hostin e faqes.
 */
function resolveApiUrl(): string {
  const explicit = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  if (!__DEV__) return '';

  const port = readInt(process.env.EXPO_PUBLIC_DEV_API_PORT, 5180);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:${port}` : `http://localhost:${port}`;
}

const apiUrl = resolveApiUrl();

if (!__DEV__ && !apiUrl.startsWith('https://')) {
  throw new Error('EXPO_PUBLIC_API_URL duhet të vendoset dhe të përdorë HTTPS në prodhim.');
}

export const config = {
  apiUrl,
  requestTimeoutMs: 15_000,
  currency: {
    code: process.env.EXPO_PUBLIC_CURRENCY_CODE ?? 'ALL',
    symbol: process.env.EXPO_PUBLIC_CURRENCY_SYMBOL ?? 'L',
    decimals: readInt(process.env.EXPO_PUBLIC_CURRENCY_DECIMALS, 0),
  },
} as const;

/** Fotot e produkteve vijnë me rrugë relative nga API-ja. */
export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${config.apiUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}
