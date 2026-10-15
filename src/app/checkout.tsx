import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  AppText,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  ErrorState,
  KeyValue,
  LoadingState,
  Notice,
  OfflineBanner,
  Screen,
  TextField,
} from '@/components';
import { useSession } from '@/features/authentication/SessionProvider';
import { useCart } from '@/features/cart/CartProvider';
import { useCartPricing } from '@/features/cart/useCartPricing';
import { useOnline } from '@/hooks/useOnline';
import { errorMessage, getLanguage, useT } from '@/localization';
import { isApiError, NetworkError } from '@/services/api/errors';
import { meApi, ordersApi } from '@/services/api/endpoints';
import { queryKeys } from '@/services/query';
import { colors, radius, spacing } from '@/theme';
import { confirm } from '@/utils/confirm';
import { formatIsoDate, formatPrice, formatQuantity, toIsoDate } from '@/utils/format';

const DAY_NAMES = {
  sq: ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export default function CheckoutScreen() {
  const tr = useT();
  const online = useOnline();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { state, dispatch, ensureCheckoutKey } = useCart();
  const pricing = useCartPricing();
  const addresses = useQuery({ queryKey: queryKeys.addresses, queryFn: () => meApi.addresses() });

  const [addressId, setAddressId] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<{ title?: string; message: string } | null>(null);
  const submitting = useRef(false);

  const dates = useMemo(() => {
    const days = DAY_NAMES[getLanguage()];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      return { value: toIsoDate(d), label: `${days[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}` };
    });
  }, []);

  const selectedAddressId = addressId ?? addresses.data?.find((a) => a.isDefault)?.id ?? addresses.data?.[0]?.id ?? null;
  const selectedAddress = addresses.data?.find((a) => a.id === selectedAddressId);

  const mutation = useMutation({
    mutationFn: ({ key, total }: { key: string; total: number }) =>
      ordersApi.create(
        {
          addressId: selectedAddressId!,
          items: state.items.map((i) => ({ productId: i.product.productId, quantity: i.quantity })),
          notes: notes.trim() || undefined,
          requestedDeliveryDate: date ?? undefined,
          expectedTotal: total,
        },
        key,
      ),
    onSuccess: (result) => {
      dispatch({ type: 'clear' });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      router.replace({ pathname: '/orders/[id]', params: { id: result.order.id, created: '1' } });
    },
    onError: (e) => {
      if (e instanceof NetworkError) {
        // Çelësi ruhet: riprovimi kthen të njëjtën porosi nëse serveri e kishte krijuar.
        setError({ title: tr.checkout.notSentTitle, message: tr.checkout.notSentMessage });
        return;
      }
      if (isApiError(e, 'idempotency_key_reused')) dispatch({ type: 'setCheckoutKey', key: null });
      if (isApiError(e, 'price_changed') || isApiError(e, 'cart_invalid')) {
        void queryClient.invalidateQueries({ queryKey: ['pricing'] });
      }
      setError({ message: errorMessage(e) });
    },
    onSettled: () => {
      submitting.current = false;
    },
  });

  if (state.items.length === 0 && !mutation.isPending) {
    return (
      <Screen>
        <EmptyState icon="cart-outline" title={tr.cart.emptyTitle} action={{ title: tr.cart.browse, onPress: () => router.replace('/catalog') }} />
      </Screen>
    );
  }
  if (addresses.isPending || (pricing.isPending && pricing.fetchStatus !== 'idle')) return <LoadingState />;
  if (addresses.isError) return <Screen><ErrorState message={errorMessage(addresses.error)} onRetry={() => addresses.refetch()} /></Screen>;

  const priced = pricing.data;
  const blocked = !priced?.isValid || !pricing.upToDate;
  const canSend = online && !!selectedAddress && !blocked && !mutation.isPending;

  const send = async () => {
    if (!priced || submitting.current) return;
    setError(null);
    const ok = await confirm({ title: tr.checkout.confirmTitle, message: tr.checkout.confirmMessage(formatPrice(priced.total)), confirmText: tr.checkout.send });
    // Mbrojtje nga prekjet e shumëfishta: një dërgim i vetëm në të njëjtën kohë.
    if (!ok || submitting.current) return;
    submitting.current = true;
    mutation.mutate({ key: ensureCheckoutKey(), total: priced.total });
  };

  return (
    <View style={styles.root}>
      <OfflineBanner message={tr.common.offlineAction} />
      <Screen
        scroll
        style={styles.content}
        footer={
          <>
            {error ? (
              <Notice kind="danger">{error.title ? `${error.title}. ${error.message}` : error.message}</Notice>
            ) : null}
            {blocked && !pricing.isFetching ? (
              <Button title={tr.checkout.reviewCart} variant="secondary" onPress={() => router.back()} fullWidth />
            ) : null}
            <Button
              title={mutation.isPending ? tr.checkout.sending : `${tr.checkout.send} · ${priced ? formatPrice(priced.total) : ''}`}
              onPress={send}
              loading={mutation.isPending}
              disabled={!canSend}
              fullWidth
            />
          </>
        }
      >
        <Card>
          <AppText variant="caption" color="textSecondary">
            {tr.checkout.customer}
          </AppText>
          <AppText variant="bodyStrong">{user?.customer.businessName}</AppText>
          <AppText color="textSecondary">
            {user?.fullName} · {user?.phone}
          </AppText>
        </Card>

        <View style={styles.section}>
          <AppText variant="heading">{tr.checkout.deliveryAddress}</AppText>
          {addresses.data.length === 0 ? (
            <Notice kind="warning">{tr.checkout.noAddress}</Notice>
          ) : (
            addresses.data.map((a) => {
              const selected = a.id === selectedAddressId;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setAddressId(a.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={[styles.address, selected && styles.addressSelected]}
                >
                  <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.primary : colors.textMuted} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">{a.name}</AppText>
                    <AppText color="textSecondary">
                      {a.street}, {a.city}
                    </AppText>
                    {a.contactName || a.contactPhone ? (
                      <AppText variant="caption" color="textSecondary">
                        {tr.checkout.contact}: {[a.contactName, a.contactPhone].filter(Boolean).join(' · ')}
                      </AppText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <AppText variant="heading">{tr.checkout.deliveryDate}</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label={tr.checkout.noDate} selected={date === null} onPress={() => setDate(null)} />
            {dates.map((d) => (
              <Chip key={d.value} label={d.label} selected={date === d.value} onPress={() => setDate(d.value)} />
            ))}
          </ScrollView>
          {date ? (
            <AppText variant="caption" color="textSecondary">
              {formatIsoDate(date)}
            </AppText>
          ) : null}
        </View>

        <View style={styles.section}>
          <TextField
            label={tr.checkout.notes}
            placeholder={tr.checkout.notesPlaceholder}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={1000}
            style={styles.notes}
          />
        </View>

        <View style={styles.section}>
          <AppText variant="heading">{tr.checkout.products}</AppText>
          <Card>
            {state.items.map((i) => {
              const line = priced?.lines.find((l) => l.productId === i.product.productId);
              return (
                <View key={i.product.productId} style={styles.line}>
                  <View style={styles.flex}>
                    <AppText numberOfLines={2}>{i.product.name}</AppText>
                    <AppText variant="caption" color="textSecondary">
                      {formatQuantity(i.quantity)} {i.product.unit} × {formatPrice(line?.unitPrice ?? i.product.promoPrice ?? i.product.price)}
                    </AppText>
                    {line?.issues.map((x) => (
                      <AppText key={x.code} variant="caption" color="danger">
                        {x.message}
                      </AppText>
                    ))}
                  </View>
                  <AppText variant="bodyStrong">{line ? formatPrice(line.lineTotal) : '—'}</AppText>
                </View>
              );
            })}
            {priced ? (
              <>
                <Divider />
                <KeyValue label={tr.cart.subtotal} value={formatPrice(priced.subtotal)} />
                {priced.discountTotal > 0 ? <KeyValue label={tr.cart.discount} value={`-${formatPrice(priced.discountTotal)}`} /> : null}
                <KeyValue label={tr.cart.delivery} value={priced.deliveryFee > 0 ? formatPrice(priced.deliveryFee) : tr.cart.free} />
                <KeyValue label={tr.cart.total} value={formatPrice(priced.total)} strong />
              </>
            ) : null}
          </Card>
          <AppText variant="caption" color="textMuted">
            {tr.cart.estimateNote}
          </AppText>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { gap: spacing.lg },
  section: { gap: spacing.sm },
  address: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  addressSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chips: { gap: spacing.sm },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  line: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingVertical: spacing.xs },
});
