import { formatDate, formatIsoDate, formatPrice, formatQuantity } from '../format';

describe('formatPrice', () => {
  it('grupon mijëshet me pikë dhe shton simbolin', () => {
    expect(formatPrice(1250)).toBe('1.250 L');
    expect(formatPrice(1234567)).toBe('1.234.567 L');
    expect(formatPrice(0)).toBe('0 L');
  });

  it('respekton decimalet dhe simbolin e konfiguruar', () => {
    expect(formatPrice(1250.5, { decimals: 2, symbol: 'ALL' })).toBe('1.250,50 ALL');
    expect(formatPrice(-15, { decimals: 0 })).toBe('-15 L');
  });
});

describe('formatQuantity', () => {
  it('heq zerot e panevojshme', () => {
    expect(formatQuantity(24)).toBe('24');
    expect(formatQuantity(1.5)).toBe('1,5');
    expect(formatQuantity(0.1 + 0.2)).toBe('0,3');
    expect(formatQuantity(1000)).toBe('1.000');
  });
});

describe('datat', () => {
  it('formaton datën ISO pa zhvendosje zone', () => {
    expect(formatIsoDate('2026-10-17')).toBe('17.10.2026');
  });

  it('formaton datën lokale', () => {
    expect(formatDate(new Date(2026, 0, 5, 12).toISOString())).toBe('05.01.2026');
  });
});
