import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import type { Product } from '@/types/api';

import { cartReducer, emptyCart, type CartAction, type CartProductSnapshot, type CartState } from './cartReducer';

/**
 * Shporta ruhet në pajisje (AsyncStorage) për çdo përdorues, që të mos humbasë gjatë navigimit,
 * mbylljes së aplikacionit apo mungesës së internetit. Nuk përmban të dhëna sekrete.
 */
interface CartContextValue {
  state: CartState;
  ready: boolean;
  dispatch: (action: CartAction) => void;
  add: (product: Product | CartProductSnapshot, quantity?: number) => void;
  quantityOf: (productId: number) => number;
  /** Kthen çelësin e idempotencës për porosinë aktuale (e krijon nëse mungon). */
  ensureCheckoutKey: () => string;
}

const CartContext = createContext<CartContextValue | null>(null);

export function toSnapshot(p: Product | CartProductSnapshot): CartProductSnapshot {
  if ('productId' in p) return p;
  return {
    productId: p.id,
    name: p.name,
    code: p.code,
    imageUrl: p.imageUrl,
    unit: p.unit,
    price: p.price,
    promoPrice: p.promoPrice,
    packSize: p.packSize,
    minOrderQuantity: p.minOrderQuantity,
  };
}

const GUEST_KEY = 'distribo.cart.guest';

function isCartState(value: unknown): value is CartState {
  return typeof value === 'object' && value !== null && Array.isArray((value as CartState).items);
}

function parseCart(raw: string | null): CartState {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isCartState(parsed) ? parsed : emptyCart;
  } catch {
    return emptyCart;
  }
}

export function CartProvider({ userId, children }: { userId: number; children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, emptyCart);
  const storageKey = userId ? `distribo.cart.${userId}` : GUEST_KEY;
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Provider-i rimontohet për çdo përdorues (key={userId}), ndaj ngarkimi bëhet një herë.
  // Pas hyrjes, artikujt e shtuar si vizitor kalojnë në shportën e llogarisë.
  useEffect(() => {
    const load = async (): Promise<CartState> => {
      const own = parseCart(await AsyncStorage.getItem(storageKey));
      if (storageKey === GUEST_KEY) return own;
      const guest = parseCart(await AsyncStorage.getItem(GUEST_KEY));
      if (guest.items.length === 0) return own;
      await AsyncStorage.removeItem(GUEST_KEY);
      return guest.items.reduce(
        (state, item) => cartReducer(state, { type: 'add', product: item.product, quantity: item.quantity }),
        own,
      );
    };
    load()
      .then((state) => dispatch({ type: 'hydrate', state }))
      .catch(() => dispatch({ type: 'hydrate', state: emptyCart }))
      .finally(() => {
        hydrated.current = true;
        setReady(true);
      });
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(state)).catch(() => undefined);
  }, [state, storageKey]);

  const add = useCallback((product: Product | CartProductSnapshot, quantity?: number) => {
    dispatch({ type: 'add', product: toSnapshot(product), quantity });
  }, []);

  const quantityOf = useCallback(
    (productId: number) => state.items.find((i) => i.product.productId === productId)?.quantity ?? 0,
    [state.items],
  );

  const ensureCheckoutKey = useCallback(() => {
    const existing = stateRef.current.checkoutKey;
    if (existing) return existing;
    const key = Crypto.randomUUID();
    dispatch({ type: 'setCheckoutKey', key });
    stateRef.current = { ...stateRef.current, checkoutKey: key };
    return key;
  }, []);

  const value = useMemo(
    () => ({ state, ready, dispatch, add, quantityOf, ensureCheckoutKey }),
    [state, ready, add, quantityOf, ensureCheckoutKey],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart duhet të përdoret brenda <CartProvider>.');
  return ctx;
}
