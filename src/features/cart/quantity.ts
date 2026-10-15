/**
 * Rregullat e sasisë: sasia duhet të jetë ≥ minimumi dhe shumëfish i paketimit.
 * Llogaritjet bëhen në "hapa" të plotë për të shmangur gabimet e numrave dhjetorë (0.1 + 0.2).
 */

export interface QuantityRules {
  packSize: number;
  minOrderQuantity: number;
}

const EPS = 1e-9;

function step(rules: QuantityRules): number {
  return rules.packSize > 0 ? rules.packSize : 1;
}

function roundTo3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/** Sasia më e vogël e lejuar: minimumi i rrumbullakosur lart në shumëfishin e paketimit. */
export function minimumQuantity(rules: QuantityRules): number {
  const s = step(rules);
  const steps = Math.max(1, Math.ceil(rules.minOrderQuantity / s - EPS));
  return roundTo3(steps * s);
}

/** Rrumbullakos një sasi të shkruar nga përdoruesi në sasinë më të afërt të vlefshme. */
export function normalizeQuantity(value: number, rules: QuantityRules): number {
  if (!Number.isFinite(value) || value <= 0) return minimumQuantity(rules);
  const s = step(rules);
  const steps = Math.ceil(value / s - EPS);
  return Math.max(minimumQuantity(rules), roundTo3(steps * s));
}

export function increaseQuantity(current: number, rules: QuantityRules): number {
  if (current <= 0) return minimumQuantity(rules);
  return roundTo3(normalizeQuantity(current, rules) + step(rules));
}

/** Kthen 0 kur sasia bie nën minimum (d.m.th. produkti hiqet). */
export function decreaseQuantity(current: number, rules: QuantityRules): number {
  const next = roundTo3(normalizeQuantity(current, rules) - step(rules));
  return next < minimumQuantity(rules) - EPS ? 0 : next;
}

export function isValidQuantity(value: number, rules: QuantityRules): boolean {
  if (value < rules.minOrderQuantity - EPS) return false;
  const ratio = value / step(rules);
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}
