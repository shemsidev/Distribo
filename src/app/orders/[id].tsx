import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  AppText,
  Button,
  Card,
  Divider,
  ErrorState,
  KeyValue,
  LoadingState,
  Notice,
  ProductImage,
  Screen,
  StatusBadge,
  useToast,
} from '@/components';
import { useCart } from '@/features/cart/CartProvider';
import { normalizeQuantity } from '@/features/cart/quantity';
import { errorMessage, useT } from '@/localization';
import { catalogApi, ordersApi } from '@/services/api/endpoints';
import { queryKeys } from '@/services/query';
import { colors, radius, spacing } from '@/theme';
import type { OrderStatus } from '@/types/api';
import { confirm } from '@/utils/confirm';
import { formatDateTime, formatIsoDate, formatPrice, formatQuantity } from '@/utils/format';

const FLOW: OrderStatus[] = ['Pending', 'Confirmed', 'Preparing', 'InTransit', 'Delivered'];

export default function OrderDetailScreen() {
  const tr = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { add } = useCart();
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  // Pas dërgimit: kthim me një prekje në kryefaqe (pa kaluar sërish te konfirmimi/shporta).
  const backToShop = () => {
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/');
  };
  const [reordering, setReordering] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const order = useQuery({ queryKey: queryKeys.order(id), queryFn: () => ordersApi.get(id), staleTime: 10_000 });

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(id),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.order(id), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
    },
    onError: (e) => setActionError(errorMessage(e)),
  });

  if (order.isPending) return <LoadingState />;
  if (order.isError) return <Screen><ErrorState message={errorMessage(order.error)} onRetry={() => order.refetch()} /></Screen>;
  const o = order.data;

  /** Kopjon artikujt në shportë me të dhënat dhe çmimet AKTUALE, duke kapërcyer ato që s'janë më aktive. */
  const reorder = async () => {
    setReordering(true);
    setActionError(null);
    try {
      const results = await Promise.allSettled(o.lines.map((l) => catalogApi.product(l.productId)));
      let added = 0;
      results.forEach((r, i) => {
        const line = o.lines[i]!;
        if (r.status === 'fulfilled' && r.value.stock.inStock) {
          add(r.value, normalizeQuantity(line.quantity, r.value));
          added++;
        }
      });
      const skipped = o.lines.length - added;
      if (added === 0) {
        setActionError(tr.orders.reorderNone);
        return;
      }
      toast.show(tr.orders.reorderDone(added, skipped), skipped > 0 ? 'info' : 'success');
      router.navigate('/cart');
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setReordering(false);
    }
  };

  const onCancel = async () => {
    setActionError(null);
    const ok = await confirm({ title: tr.orders.cancelConfirmTitle, message: tr.orders.cancelConfirmMessage, confirmText: tr.orders.cancel, destructive: true });
    if (ok) cancel.mutate();
  };

  const reached = new Set(o.statusHistory.map((h) => h.status));
  const timeline: OrderStatus[] = o.status === 'Cancelled' ? [...FLOW.filter((s) => reached.has(s)), 'Cancelled'] : FLOW;

  return (
    <>
      <Stack.Screen
        options={{
          title: tr.orders.number(o.number),
          headerLeft: created
            ? () => (
                <Pressable onPress={backToShop} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr.orders.close}>
                  <Ionicons name="close" size={26} color={colors.primary} />
                </Pressable>
              )
            : undefined,
          gestureEnabled: !created,
        }}
      />
      <Screen
        scroll
        style={styles.content}
        refreshControl={<RefreshControl refreshing={order.isRefetching} onRefresh={() => order.refetch()} tintColor={colors.primary} />}
        footer={
          <>
            {actionError ? <Notice kind="danger">{actionError}</Notice> : null}
            <View style={styles.actions}>
              {o.canCancel ? (
                <View style={styles.flex}>
                  <Button title={tr.orders.cancel} variant="danger" onPress={onCancel} loading={cancel.isPending} fullWidth />
                </View>
              ) : null}
              <View style={styles.flex}>
                <Button
                  title={tr.orders.reorder}
                  onPress={reorder}
                  loading={reordering}
                  fullWidth
                  icon={<Ionicons name="repeat" size={18} color={colors.textOnPrimary} />}
                />
              </View>
            </View>
          </>
        }
      >
        {created ? (
          <View style={styles.success}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <AppText variant="heading" align="center">
              {tr.orders.successTitle}
            </AppText>
            <AppText color="textSecondary" align="center">
              {tr.orders.successMessage}
            </AppText>
            <View style={styles.successAction}>
              <Button title={tr.orders.continueShopping} variant="dark" onPress={backToShop} fullWidth />
            </View>
          </View>
        ) : null}

        <Card>
          <View style={styles.headerRow}>
            <View style={styles.flex}>
              <AppText variant="heading">{tr.orders.number(o.number)}</AppText>
              <AppText variant="caption" color="textSecondary">
                {formatDateTime(o.createdAt)}
              </AppText>
            </View>
            <StatusBadge status={o.status} />
          </View>
          <Divider />
          {timeline.map((s) => {
            const entry = [...o.statusHistory].reverse().find((h) => h.status === s);
            const done = !!entry;
            return (
              <View key={s} style={styles.step}>
                <View style={[styles.dot, done && (s === 'Cancelled' ? styles.dotCancelled : styles.dotDone)]}>
                  {done ? <Ionicons name={s === 'Cancelled' ? 'close' : 'checkmark'} size={12} color={colors.textOnPrimary} /> : null}
                </View>
                <View style={styles.flex}>
                  <AppText variant={done ? 'bodyStrong' : 'body'} color={done ? 'text' : 'textMuted'}>
                    {tr.status[s]}
                  </AppText>
                  {entry ? (
                    <AppText variant="caption" color="textSecondary">
                      {formatDateTime(entry.changedAt)}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </AppText>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Card>

        <Card>
          <AppText variant="heading">{tr.orders.address}</AppText>
          <AppText variant="bodyStrong">{o.deliveryAddress.name}</AppText>
          <AppText color="textSecondary">
            {o.deliveryAddress.street}, {o.deliveryAddress.city}
          </AppText>
          {o.deliveryAddress.contactName || o.deliveryAddress.contactPhone ? (
            <AppText variant="caption" color="textSecondary">
              {[o.deliveryAddress.contactName, o.deliveryAddress.contactPhone].filter(Boolean).join(' · ')}
            </AppText>
          ) : null}
          {o.requestedDeliveryDate ? <KeyValue label={tr.orders.requestedDate} value={formatIsoDate(o.requestedDeliveryDate)} /> : null}
          {o.notes ? (
            <>
              <Divider />
              <AppText variant="caption" color="textSecondary">
                {tr.orders.notes}
              </AppText>
              <AppText>{o.notes}</AppText>
            </>
          ) : null}
        </Card>

        <Card>
          <AppText variant="heading">{tr.orders.items}</AppText>
          {o.lines.map((l) => (
            <View key={l.productId} style={styles.line}>
              <ProductImage uri={l.imageUrl} size={48} />
              <View style={styles.flex}>
                <AppText numberOfLines={2}>{l.productName}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {l.productCode} · {formatQuantity(l.quantity)} {l.unit} × {formatPrice(l.unitPrice)}
                </AppText>
              </View>
              <AppText variant="bodyStrong">{formatPrice(l.lineTotal)}</AppText>
            </View>
          ))}
          <Divider />
          <KeyValue label={tr.cart.subtotal} value={formatPrice(o.subtotal)} />
          {o.discountTotal > 0 ? <KeyValue label={tr.cart.discount} value={`-${formatPrice(o.discountTotal)}`} /> : null}
          <KeyValue label={tr.cart.delivery} value={o.deliveryFee > 0 ? formatPrice(o.deliveryFee) : tr.cart.free} />
          <KeyValue label={tr.product.total} value={formatPrice(o.total)} strong />
          <AppText variant="caption" color="textMuted">
            {tr.orders.pricesAtOrder}
          </AppText>
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.lg },
  success: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  successAction: { maxWidth: 400, width: '100%', marginTop: spacing.sm, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: spacing.xs },
  dot: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotCancelled: { backgroundColor: colors.danger, borderColor: colors.danger },
  line: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingVertical: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md },
});
