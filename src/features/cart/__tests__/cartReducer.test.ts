import { cartReducer, emptyCart, localEstimate, type CartProductSnapshot, type CartState } from '../cartReducer';

const water: CartProductSnapshot = {
  productId: 1, name: 'Ujë 0.5L', code: 'ART1001', imageUrl: null, unit: 'copë',
  price: 35, promoPrice: null, packSize: 12, minOrderQuantity: 12,
};
const cheese: CartProductSnapshot = {
  productId: 2, name: 'Djathë', code: 'ART1025', imageUrl: null, unit: 'kg',
  price: 850, promoPrice: 800, packSize: 0.5, minOrderQuantity: 1,
};

describe('cartReducer', () => {
  it('shton produktin me sasinë minimale dhe e rrit me hapin e paketimit', () => {
    let s = cartReducer(emptyCart, { type: 'add', product: water });
    expect(s.items[0]?.quantity).toBe(12);
    s = cartReducer(s, { type: 'add', product: water });
    expect(s.items).toHaveLength(1);
    expect(s.items[0]?.quantity).toBe(24);
  });

  it('shton sasi të caktuar duke e rrumbullakosur te paketimi', () => {
    const s = cartReducer(emptyCart, { type: 'add', product: water, quantity: 30 });
    expect(s.items[0]?.quantity).toBe(36);
  });

  it('ulja nën minimum e heq produktin', () => {
    let s = cartReducer(emptyCart, { type: 'add', product: cheese });
    s = cartReducer(s, { type: 'increment', productId: 2 });
    expect(s.items[0]?.quantity).toBe(1.5);
    s = cartReducer(s, { type: 'decrement', productId: 2 });
    s = cartReducer(s, { type: 'decrement', productId: 2 });
    expect(s.items).toHaveLength(0);
  });

  it('çdo ndryshim i përmbajtjes rivendos çelësin e porosisë', () => {
    let s: CartState = cartReducer(emptyCart, { type: 'add', product: water });
    s = cartReducer(s, { type: 'setCheckoutKey', key: 'abc' });
    expect(s.checkoutKey).toBe('abc');
    s = cartReducer(s, { type: 'increment', productId: 1 });
    expect(s.checkoutKey).toBeNull();
  });

  it('përditësimi i të dhënave të produkteve nuk prek sasinë as çelësin', () => {
    let s: CartState = cartReducer(emptyCart, { type: 'add', product: water });
    s = cartReducer(s, { type: 'setCheckoutKey', key: 'abc' });
    s = cartReducer(s, { type: 'refreshSnapshots', products: [{ ...water, price: 40 }] });
    expect(s.items[0]?.product.price).toBe(40);
    expect(s.items[0]?.quantity).toBe(12);
    expect(s.checkoutKey).toBe('abc');
  });

  it('set me 0 e heq; clear e zbraz', () => {
    let s = cartReducer(emptyCart, { type: 'add', product: water });
    s = cartReducer(s, { type: 'add', product: cheese });
    s = cartReducer(s, { type: 'set', productId: 1, quantity: 0 });
    expect(s.items.map((i) => i.product.productId)).toEqual([2]);
    expect(cartReducer(s, { type: 'clear' })).toEqual(emptyCart);
  });

  it('totali tregues përdor çmimin promocional', () => {
    let s = cartReducer(emptyCart, { type: 'add', product: water });
    s = cartReducer(s, { type: 'add', product: cheese });
    expect(localEstimate(s)).toBe(12 * 35 + 1 * 800);
  });
});
