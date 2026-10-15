import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText, Button, Divider, ErrorState, KeyValue, LoadingState, Notice, ProductImage, QuantityStepper, useToast } from '@/components';
import { useSession } from '@/features/authentication/SessionProvider';
import { useCart } from '@/features/cart/CartProvider';
import { cartCount, localEstimate } from '@/features/cart/cartReducer';
import { decreaseQuantity, increaseQuantity, minimumQuantity } from '@/features/cart/quantity';
import { useLayout } from '@/hooks/useLayout';
import { errorMessage, useT } from '@/localization';
import { catalogApi } from '@/services/api/endpoints';
import { isApiError } from '@/services/api/errors';
import { queryKeys } from '@/services/query';
import { colors, radius, spacing } from '@/theme';
import { formatDate, formatPrice, formatQuantity } from '@/utils/format';

/**
 * Dritarja "Porosi": çmimi, produkti, totali dhe sasia, me butonin "Shto në Shportë".
 * Në telefon del nga poshtë; në tablet/web shfaqet në qendër.
 */
export default function ProductOrderModal() {
  const tr = useT();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();
  const { status } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const { quantityOf, dispatch, add, state: cart } = useCart();
  const inCart = quantityOf(productId);
  const [selected, setSelected] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const query = useQuery({ queryKey: queryKeys.product(productId), queryFn: () => catalogApi.product(productId) });
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  // Mbyll dritaren dhe hap direkt shportën (tab-i), pa u kthyer faqe pas faqeje.
  const openCart = () => {
    close();
    router.navigate('/cart');
  };
  const cartItems = cartCount(cart);

  let body: React.ReactNode;
  if (query.isPending) body = <View style={styles.stateBox}><LoadingState /></View>;
  else if (query.isError) {
    const notFound = isApiError(query.error, 'not_found');
    body = (
      <View style={styles.stateBox}>
        <ErrorState message={notFound ? tr.product.notFound : errorMessage(query.error)} onRetry={notFound ? undefined : () => query.refetch()} />
      </View>
    );
  } else {
    const p = query.data;
    const rules = { packSize: p.packSize, minOrderQuantity: p.minOrderQuantity };
    const quantity = selected ?? (inCart > 0 ? inCart : minimumQuantity(rules));
    const hasPromo = p.promoPrice != null && p.promoPrice < p.price;
    const unitPrice = hasPromo ? p.promoPrice! : p.price;
    const outOfStock = !p.stock.inStock;

    const save = () => {
      if (inCart > 0) dispatch({ type: 'set', productId, quantity });
      else add(p, quantity);
      toast.show(tr.product.added);
      close();
    };

    body = (
      <>
        <ScrollView contentContainerStyle={styles.body} bounces={false}>
          <View style={styles.imageFrame}>
            <ProductImage uri={p.imageUrl} />
          </View>
          <Divider />
          <KeyValue
            label={tr.product.price}
            value={
              <View style={styles.priceValue}>
                {hasPromo ? (
                  <AppText variant="caption" color="textMuted" style={styles.strike}>
                    {formatPrice(p.price)}
                  </AppText>
                ) : null}
                <AppText variant="bodyStrong" color={hasPromo ? 'primary' : 'text'}>
                  {formatPrice(unitPrice)} / {p.unit}
                </AppText>
              </View>
            }
          />
          <KeyValue label={tr.product.productLabel} value={p.name} />
          <KeyValue label={tr.product.total} value={formatPrice(unitPrice * quantity)} strong />

          {hasPromo && p.promoEndsAt ? (
            <Notice kind="warning">
              {p.promoTitle ? `${p.promoTitle}. ` : ''}
              {tr.product.promoUntil(formatDate(p.promoEndsAt))}
            </Notice>
          ) : null}
          {status !== 'signedIn' ? <Notice kind="info">{tr.auth.guestPriceNote}</Notice> : null}

          <QuantityStepper
            value={quantity}
            unit={p.unit}
            label={tr.product.quantity}
            onIncrease={() => setSelected(increaseQuantity(quantity, rules))}
            onDecrease={() => setSelected(Math.max(minimumQuantity(rules), decreaseQuantity(quantity, rules)))}
          />
          {p.packSize > 1 || p.minOrderQuantity > 1 || !Number.isInteger(p.packSize) ? (
            <AppText variant="caption" color="textSecondary" align="center">
              {tr.product.minQuantity}: {formatQuantity(p.minOrderQuantity)} {p.unit}
              {p.packagingInfo ? ` · ${p.packagingInfo}` : ''}
            </AppText>
          ) : null}
          {inCart > 0 ? (
            <AppText variant="caption" color="success" align="center" style={styles.bold}>
              {tr.product.inCart(`${formatQuantity(inCart)} ${p.unit}`)}
            </AppText>
          ) : null}

          <Pressable onPress={() => setShowDetails((v) => !v)} style={styles.detailsToggle} accessibilityRole="button" accessibilityState={{ expanded: showDetails }}>
            <AppText variant="bodyStrong" color="textSecondary">
              {tr.product.details}
            </AppText>
            <Ionicons name={showDetails ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
          </Pressable>
          {showDetails ? (
            <View style={styles.details}>
              <KeyValue label={tr.product.code} value={p.code} />
              {p.barcode ? <KeyValue label={tr.product.barcode} value={p.barcode} /> : null}
              <KeyValue label={tr.product.unit} value={p.unit} />
              {p.packagingInfo ? <KeyValue label={tr.product.packaging} value={p.packagingInfo} /> : null}
              <KeyValue
                label={tr.product.stock}
                value={
                  outOfStock
                    ? tr.product.outOfStock
                    : p.stock.visible && p.stock.quantity != null
                      ? tr.product.stockQty(`${formatQuantity(p.stock.quantity)} ${p.unit}`)
                      : tr.product.inStock
                }
              />
              {p.description ? <AppText color="textSecondary">{p.description}</AppText> : null}
              <AppText variant="caption" color="textMuted">
                {tr.product.priceNote}
              </AppText>
            </View>
          ) : null}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Button
            title={outOfStock ? tr.product.outOfStock : inCart > 0 ? tr.product.updateCart : tr.product.addToCartShort}
            onPress={save}
            disabled={outOfStock}
            fullWidth
            variant="dark"
          />
          {cartItems > 0 ? (
            <Pressable onPress={openCart} style={styles.cartLink} accessibilityRole="link">
              <Ionicons name="cart" size={18} color={colors.primary} />
              <AppText variant="bodyStrong" color="primary" style={styles.flex}>
                {tr.product.cartSummary(tr.common.items(cartItems), formatPrice(localEstimate(cart)))}
              </AppText>
              <AppText variant="bodyStrong" color="primary">
                {tr.product.viewCart}
              </AppText>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      </>
    );
  }

  return (
    <View style={[styles.overlay, isWide ? styles.overlayCenter : styles.overlayBottom]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={tr.common.close} />
      <View style={[styles.sheet, isWide ? styles.sheetCenter : styles.sheetBottom]} accessibilityViewIsModal>
        <View style={styles.header}>
          <AppText variant="heading">{tr.product.modalTitle}</AppText>
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr.common.close}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        {body}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay },
  overlayCenter: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  overlayBottom: { justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, overflow: 'hidden', maxHeight: '92%' },
  sheetCenter: { width: '100%', maxWidth: 420, borderRadius: radius.md },
  sheetBottom: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  body: { padding: spacing.lg, gap: spacing.md },
  imageFrame: {
    alignSelf: 'center',
    width: 160,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    padding: spacing.xs,
  },
  priceValue: { alignItems: 'flex-end' },
  strike: { textDecorationLine: 'line-through' },
  bold: { fontWeight: '700' },
  detailsToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  details: { gap: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  stateBox: { minHeight: 240 },
  flex: { flex: 1 },
  cartLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
});
