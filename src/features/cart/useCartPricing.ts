import { useEffect, useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ordersApi } from '@/services/api/endpoints';
import { queryKeys } from '@/services/query';

import { useCart } from './CartProvider';

/**
 * Çmimet e shportës nga serveri (çmimi i klientit, ofertat, rregullat, stoku dhe transporti).
 * Kërkesa dërgohet pak pasi përdoruesi ndalon së ndryshuari sasitë.
 */
export function useCartPricing() {
  const { state, dispatch } = useCart();
  const items = useMemo(
    () => state.items.map((i) => ({ productId: i.product.productId, quantity: i.quantity })),
    [state.items],
  );
  const debounced = useDebouncedValue(items, 400);

  const query = useQuery({
    queryKey: queryKeys.pricing(debounced),
    queryFn: ({ signal }) => ordersApi.pricing(debounced, signal),
    enabled: debounced.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  // Përditëso emrat/çmimet treguese të ruajtura në pajisje me ato të serverit.
  useEffect(() => {
    if (!query.data) return;
    const current = new Map(state.items.map((i) => [i.product.productId, i.product]));
    const fresh = query.data.lines
      .filter((l) => l.issues.every((x) => x.code !== 'unavailable') && current.has(l.productId))
      .map((l) => {
        const old = current.get(l.productId)!;
        return {
          ...old,
          name: l.name,
          imageUrl: l.imageUrl,
          unit: l.unit,
          price: l.listPrice,
          promoPrice: l.unitPrice < l.listPrice ? l.unitPrice : null,
          packSize: l.packSize,
          minOrderQuantity: l.minOrderQuantity,
        };
      })
      .filter((p) => {
        const old = current.get(p.productId)!;
        return old.price !== p.price || old.promoPrice !== p.promoPrice || old.name !== p.name ||
          old.packSize !== p.packSize || old.minOrderQuantity !== p.minOrderQuantity;
      });
    if (fresh.length > 0) dispatch({ type: 'refreshSnapshots', products: fresh });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- vetëm kur vijnë çmime të reja
  }, [query.data]);

  const upToDate = JSON.stringify(debounced) === JSON.stringify(items) && !query.isFetching && !query.isPlaceholderData;
  return { ...query, upToDate };
}
