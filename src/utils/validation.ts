/**
 * Validim në klient për reagim të shpejtë. Serveri validon gjithçka përsëri;
 * këto rregulla pasqyrojnë server/Distribo.Api/Auth/Identifiers.cs.
 */

/** Normalizon numrat shqiptarë në E.164 (+355…). Kthen null nëse numri nuk është i vlefshëm. */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('00')) {
    digits = digits.slice(2);
    hasPlus = true;
  }
  if (!hasPlus) {
    if (digits.startsWith('0')) digits = `355${digits.slice(1)}`;
    else if (!digits.startsWith('355')) digits = `355${digits}`;
  }
  if (digits.startsWith('355')) {
    let national = digits.slice(3);
    if (national.startsWith('0')) national = national.slice(1);
    return national.length === 8 || national.length === 9 ? `+355${national}` : null;
  }
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

export function isValidEmail(input: string): boolean {
  const email = input.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export type PasswordProblem = 'short' | 'weak' | null;

export function checkPassword(password: string): PasswordProblem {
  if (password.length < 8) return 'short';
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 'weak';
  return null;
}
