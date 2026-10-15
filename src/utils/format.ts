import { config } from '@/constants/config';

/** Grupon shifrat me pikë dhe përdor presjen për decimalet (konventa shqiptare). */
export function formatNumber(value: number, decimals: number): string {
  const fixed = Math.abs(value).toFixed(decimals);
  const [intPart = '0', decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = value < 0 && Number(fixed) !== 0 ? '-' : '';
  return sign + grouped + (decPart ? `,${decPart}` : '');
}

export interface PriceFormatOptions {
  symbol?: string;
  decimals?: number;
}

/** Formaton një çmim, p.sh. 1250 → "1.250 L". Monedha konfigurohet në `config.currency`. */
export function formatPrice(value: number, options: PriceFormatOptions = {}): string {
  const symbol = options.symbol ?? config.currency.symbol;
  const decimals = options.decimals ?? config.currency.decimals;
  return `${formatNumber(value, decimals)} ${symbol}`;
}

/** Sasi pa zero të panevojshme: 24 → "24", 1.5 → "1,5", 0.25 → "0,25". */
export function formatQuantity(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  const decimals = Number.isInteger(rounded) ? 0 : (String(rounded).split('.')[1]?.length ?? 0);
  return formatNumber(rounded, Math.min(decimals, 3));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 2026-10-15T09:30:00Z → "15.10.2026" (ora lokale). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** 2026-10-15T09:30:00Z → "15.10.2026, 11:30". */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Data lokale në formatin e API-së (yyyy-MM-dd). */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-10-17" → "17.10.2026" pa konvertim zonash orare. */
export function formatIsoDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}
