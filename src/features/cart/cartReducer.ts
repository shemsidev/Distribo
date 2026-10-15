import { increaseQuantity, decreaseQuantity, normalizeQuantity, type QuantityRules } from './quantity';

/** Të dhënat e produktit të ruajtura në shportë për shfaqje edhe pa internet. Çmimi është vetëm tregues. */
export interface CartProductSnapshot extends QuantityRules {
  productId: number;
  name: string;
  code: string;
  imageUrl: string | null;
  unit: string;
  price: number;
  promoPrice: number | null;
}

export interface CartItem {
  product: CartProductSnapshot;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  /**
   * Çelësi i idempotencës për porosinë që po përgatitet. Mbetet i njëjtë gjatë riprovimeve
   * (p.sh. pas humbjes së lidhjes) dhe ndryshon sapo ndryshon përmbajtja e shportës.
   */
  checkoutKey: string | null;
}

export type CartAction =
  | { type: 'hydrate'; state: CartState }
  | { type: 'add'; product: CartProductSnapshot; quantity?: number }
  | { type: 'set'; productId: number; quantity: number }
  | { type: 'increment'; productId: number }
  | { type: 'decrement'; productId: number }
  | { type: 'remove'; productId: number }
  | { type: 'clear' }
  | { type: 'refreshSnapshots'; products: CartProductSnapshot[] }
  | { type: 'setCheckoutKey'; key: string | null };

export const emptyCart: CartState = { items: [], checkoutKey: null };

function withItems(state: CartState, items: CartItem[]): CartState {
  return { items, checkoutKey: null };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'hydrate':
      return action.state;

    case 'add': {
      const existing = state.items.find((i) => i.product.productId === action.product.productId);
      if (existing) {
        const quantity = action.quantity !== undefined
          ? normalizeQuantity(existing.quantity + action.quantity, action.product)
          : increaseQuantity(existing.quantity, action.product);
        return withItems(state, state.items.map((i) =>
          i === existing ? { product: action.product, quantity } : i));
      }
      const quantity = normalizeQuantity(action.quantity ?? 0, action.product);
      return withItems(state, [...state.items, { product: action.product, quantity }]);
    }

    case 'set': {
      if (action.quantity <= 0) return cartReducer(state, { type: 'remove', productId: action.productId });
      return withItems(state, state.items.map((i) =>
        i.product.productId === action.productId
          ? { ...i, quantity: normalizeQuantity(action.quantity, i.product) }
          : i));
    }

    case 'increment':
      return withItems(state, state.items.map((i) =>
        i.product.productId === action.productId ? { ...i, quantity: increaseQuantity(i.quantity, i.product) } : i));

    case 'decrement': {
      const items = state.items
        .map((i) => (i.product.productId === action.productId
          ? { ...i, quantity: decreaseQuantity(i.quantity, i.product) }
          : i))
        .filter((i) => i.quantity > 0);
      return withItems(state, items);
    }

    case 'remove':
      return withItems(state, state.items.filter((i) => i.product.productId !== action.productId));

    case 'clear':
      return emptyCart;

    case 'refreshSnapshots': {
      // Përditëson emrat/çmimet treguese pa prekur sasitë apo çelësin e porosisë.
      const byId = new Map(action.products.map((p) => [p.productId, p]));
      return {
        ...state,
        items: state.items.map((i) => {
          const fresh = byId.get(i.product.productId);
          return fresh ? { ...i, product: fresh } : i;
        }),
      };
    }

    case 'setCheckoutKey':
      return { ...state, checkoutKey: action.key };
  }
}

export function cartCount(state: CartState): number {
  return state.items.length;
}

/** Totali tregues në pajisje (pa internet). Totali i vërtetë vjen gjithmonë nga /api/cart/pricing. */
export function localEstimate(state: CartState): number {
  return state.items.reduce((sum, i) => sum + (i.product.promoPrice ?? i.product.price) * i.quantity, 0);
}
