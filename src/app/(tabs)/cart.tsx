import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  AppText,
  Button,
  Card,
  Divider,
  EmptyState,
  KeyValue,
  Notice,
  OfflineBanner,
  PriceTag,
  ProductImage,
  QuantityStepper,
} from '@/components';
import { useSession } from '@/features/authentication/SessionProvider';
import { useCart } from '@/features/cart/CartProvider';
import type { CartItem } from '@/features/cart/cartReducer';
import { localEstimate } from '@/features/cart/cartReducer';
import { useCartPricing } from '@/features/cart/useCartPricing';
import { useOnline } from '@/hooks/useOnline';
import { errorMessage, useT } from '@/localization';
import { colors, maxContentWidth, radius, spacing } from '@/theme';
import type { CartLine } from '@/types/api';
import { confirm } from '@/utils/confirm';
import { formatPrice, formatQuantity } from '@/utils/format';

export default function CartScreen() {
  const tr = useT();
  const online = useOnline();
  const { state, dispatch } = useCart();
  const { status } = useSession();
  const signedIn = status === 'signedIn';
  const pricing = useCartPricing();

  if (state.items.length === 0) {
    return (
      <View style={styles.root}>
        <EmptyState
          icon="cart-outline"
          title={tr.cart.emptyTitle}
          message={tr.cart.emptyMessage}
          action={{ title: tr.cart.browse, onPress: () => router.navigate('/catalog') }}
        />
      </View>
    );
  }

  const lines = new Map(pricing.data?.lines.map((l) => [l.productId, l]));
  const priced = pricing.data;
  const hasIssues = priced ? priced.lines.some((l) => l.issues.length > 0) : false;
  const canCheckout = online && pricing.upToDate && !!priced?.isValid;

  const clearCart = async () => {
    const ok = await confirm({ title: tr.cart.clearConfirmTitle, message: tr.cart.clearConfirmMessage, confirmText: tr.cart.clear, destructive: true });
    if (ok) dispatch({ type: 'clear' });
  };

  const removeItem = async (item: CartItem) => {
    const ok = await confirm({ title: tr.cart.remove, message: tr.cart.removeConfirm(item.product.name), confirmText: tr.cart.remove, destructive: true });
    if (ok) dispatch({ type: 'remove', productId: item.product.productId });
  };

  const freeDeliveryGap = priced && priced.deliveryFee > 0 ? priced.freeDeliveryThreshold - (priced.subtotal - priced.discountTotal) : 0;

  return (
    <View style={styles.root}>
      <OfflineBanner message={tr.cart.offlineNote} />
      <FlatList
        data={state.items}
        keyExtractor={(i) => String(i.product.productId)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <AppText variant="bodyStrong" color="textSecondary">
              {tr.common.items(state.items.length)}
            </AppText>
            <Pressable onPress={clearCart} hitSlop={8} accessibilityRole="button">
              <AppText variant="bodyStrong" color="danger">
                {tr.cart.clear}
              </AppText>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <CartRow
            item={item}
            line={lines.get(item.product.productId)}
            onIncrease={() => dispatch({ type: 'increment', productId: item.product.productId })}
            onDecrease={() =>
              decreaseWouldRemove(item) ? void removeItem(item) : dispatch({ type: 'decrement', productId: item.product.productId })
            }
            onRemove={() => void removeItem(item)}
          />
        )}
        ListFooterComponent={
          <Card style={styles.summary}>
            {priced ? (
              <>
                <KeyValue label={tr.cart.subtotal} value={formatPrice(priced.subtotal)} />
                {priced.discountTotal > 0 ? <KeyValue label={tr.cart.discount} value={`-${formatPrice(priced.discountTotal)}`} /> : null}
                <KeyValue label={tr.cart.delivery} value={priced.deliveryFee > 0 ? formatPrice(priced.deliveryFee) : tr.cart.free} />
                {freeDeliveryGap > 0 ? (
                  <AppText variant="caption" color="primary">
                    {tr.cart.freeDeliveryHint(formatPrice(freeDeliveryGap))}
                  </AppText>
                ) : null}
                <Divider />
                <KeyValue label={tr.cart.total} value={formatPrice(priced.total)} strong />
              </>
            ) : (
              <KeyValue label={tr.cart.total} value={`≈ ${formatPrice(localEstimate(state))}`} strong />
            )}
            {pricing.isError ? <Notice kind="warning">{`${tr.cart.pricingFailed} ${errorMessage(pricing.error)}`}</Notice> : null}
            <AppText variant="caption" color="textMuted">
              {tr.cart.estimateNote}
            </AppText>
          </Card>
        }
      />
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          {hasIssues ? <Notice kind="danger">{tr.cart.fixIssues}</Notice> : null}
          {!signedIn ? <Notice kind="info">{tr.auth.guestPriceNote}</Notice> : null}
          <Button
            title={signedIn ? tr.cart.checkout : tr.cart.loginToCheckout}
            onPress={() => (signedIn ? router.push('/checkout') : router.push({ pathname: '/login', params: { redirect: 'checkout' } }))}
            disabled={!canCheckout}
            loading={online && pricing.isFetching && !priced}
            fullWidth
          />
        </View>
      </View>
    </View>
  );
}

function decreaseWouldRemove(item: CartItem): boolean {
  const step = item.product.packSize > 0 ? item.product.packSize : 1;
  return item.quantity - step < item.product.minOrderQuantity - 1e-9;
}

interface CartRowProps {
  item: CartItem;
  line: CartLine | undefined;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}

function CartRow({ item, line, onIncrease, onDecrease, onRemove }: CartRowProps) {
  const tr = useT();
  const p = item.product;
  const unavailable = line?.issues.some((i) => i.code === 'unavailable');
  const listPrice = line?.listPrice ?? p.price;
  const unitPrice = line?.unitPrice ?? p.promoPrice ?? p.price;
  const lineTotal = line?.lineTotal ?? unitPrice * item.quantity;

  return (
    <View style={[styles.row, line && line.issues.length > 0 && styles.rowIssue]}>
      <Pressable onPress={() => router.push({ pathname: '/products/[id]', params: { id: String(p.productId) } })}>
        <ProductImage uri={p.imageUrl} size={64} />
      </Pressable>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <AppText variant="bodyStrong" numberOfLines={2} style={styles.flex}>
            {p.name}
          </AppText>
          <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${tr.cart.remove}: ${p.name}`}>
            <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
        {unavailable ? (
          <AppText variant="caption" color="danger">
            {tr.cart.unavailable}
          </AppText>
        ) : (
          <PriceTag price={listPrice} promoPrice={unitPrice < listPrice ? unitPrice : null} unit={p.unit} />
        )}
        {line?.issues
          .filter((i) => i.code !== 'unavailable')
          .map((i) => (
            <AppText key={i.code} variant="caption" color="danger">
              {i.message}
            </AppText>
          ))}
        <View style={styles.rowBottom}>
          <View style={styles.stepper}>
            <QuantityStepper compact value={item.quantity} unit={p.unit} label={p.name} onIncrease={onIncrease} onDecrease={onDecrease} />
          </View>
          <View style={styles.rowTotal}>
            <AppText variant="caption" color="textSecondary">
              {formatQuantity(item.quantity)} {p.unit}
            </AppText>
            <AppText variant="price">{formatPrice(lineTotal)}</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  list: { padding: spacing.lg, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIssue: { borderColor: colors.danger },
  rowBody: { flex: 1, gap: spacing.xxs },
  rowTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  rowBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing.sm, gap: spacing.sm },
  stepper: { width: 140 },
  rowTotal: { alignItems: 'flex-end' },
  summary: { marginTop: spacing.lg },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, padding: spacing.md },
  footerInner: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', gap: spacing.sm },
});
