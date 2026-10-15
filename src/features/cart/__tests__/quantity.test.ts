import { decreaseQuantity, increaseQuantity, isValidQuantity, minimumQuantity, normalizeQuantity } from '../quantity';

const pack12 = { packSize: 12, minOrderQuantity: 12 };
const kg = { packSize: 0.5, minOrderQuantity: 1 };
const pieces = { packSize: 1, minOrderQuantity: 2 };

describe('rregullat e sasisë', () => {
  it('minimumi rrumbullakoset në shumëfishin e paketimit', () => {
    expect(minimumQuantity(pack12)).toBe(12);
    expect(minimumQuantity(kg)).toBe(1);
    expect(minimumQuantity({ packSize: 6, minOrderQuantity: 8 })).toBe(12);
  });

  it('rritja dhe ulja ecin me hapin e paketimit', () => {
    expect(increaseQuantity(0, pack12)).toBe(12);
    expect(increaseQuantity(12, pack12)).toBe(24);
    expect(decreaseQuantity(24, pack12)).toBe(12);
    expect(decreaseQuantity(12, pack12)).toBe(0);
  });

  it('punon me hapa dhjetorë pa gabime rrumbullakimi', () => {
    expect(increaseQuantity(1, kg)).toBe(1.5);
    expect(increaseQuantity(1.5, kg)).toBe(2);
    expect(decreaseQuantity(1.5, kg)).toBe(1);
    expect(decreaseQuantity(1, kg)).toBe(0);
  });

  it('normalizon sasitë e shkruara me dorë', () => {
    expect(normalizeQuantity(13, pack12)).toBe(24);
    expect(normalizeQuantity(5, pack12)).toBe(12);
    expect(normalizeQuantity(1.2, kg)).toBe(1.5);
    expect(normalizeQuantity(0, pieces)).toBe(2);
    expect(normalizeQuantity(Number.NaN, pieces)).toBe(2);
  });

  it('kontrollon vlefshmërinë', () => {
    expect(isValidQuantity(24, pack12)).toBe(true);
    expect(isValidQuantity(18, pack12)).toBe(false);
    expect(isValidQuantity(1.5, kg)).toBe(true);
    expect(isValidQuantity(0.5, kg)).toBe(false);
    expect(isValidQuantity(1, pieces)).toBe(false);
  });
});
