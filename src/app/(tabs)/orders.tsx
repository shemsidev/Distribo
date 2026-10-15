import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText, EmptyState, ErrorState, LoadingState, OfflineBanner, StatusBadge } from '@/components';
import { LoginPrompt } from '@/features/authentication/LoginPrompt';
import { useSession } from '@/features/authentication/SessionProvider';
import { errorMessage, useT } from '@/localization';
import { ordersApi } from '@/services/api/endpoints';
import { queryKeys } from '@/services/query';
import { cardShadow, colors, maxContentWidth, radius, spacing } from '@/theme';
import type { OrderSummary } from '@/types/api';
import { formatDateTime, formatPrice } from '@/utils/format';

export default function OrdersScreen() {
  const tr = useT();
  const { status } = useSession();
  if (status !== 'signedIn') {
    return <LoginPrompt icon="receipt-outline" title={tr.auth.guestOrdersTitle} message={tr.auth.guestOrdersMessage} />;
  }
  return <OrdersList />;
}

function OrdersList() {
  const tr = useT();
  const orders = useInfiniteQuery({
    queryKey: queryKeys.orders,
    queryFn: ({ pageParam }) => ordersApi.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    // Statuset ndryshojnë nga distributori; rifresko kur hapet ekrani.
    staleTime: 15_000,
  });
  const items = useMemo(() => orders.data?.pages.flatMap((p) => p.items) ?? [], [orders.data]);

  if (orders.isPending) return <LoadingState />;
  if (orders.isError && items.length === 0) {
    return <ErrorState message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />;
  }

  return (
    <View style={styles.root}>
      <OfflineBanner />
      <FlatList
        data={items}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => <OrderRow order={item} />}
        contentContainerStyle={[styles.list, items.length === 0 && styles.flexGrow]}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title={tr.orders.emptyTitle}
            message={tr.orders.emptyMessage}
            action={{ title: tr.cart.browse, onPress: () => router.navigate('/catalog') }}
          />
        }
        ListFooterComponent={orders.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
        onEndReached={() => {
          if (orders.hasNextPage && !orders.isFetchingNextPage) void orders.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={orders.isRefetching && !orders.isFetchingNextPage} onRefresh={() => orders.refetch()} tintColor={colors.primary} />
        }
      />
    </View>
  );
}

function OrderRow({ order }: { order: OrderSummary }) {
  const tr = useT();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={tr.orders.number(order.number)}
    >
      <View style={styles.flex}>
        <View style={styles.rowTop}>
          <AppText variant="bodyStrong">{tr.orders.number(order.number)}</AppText>
          <StatusBadge status={order.status} />
        </View>
        <AppText variant="caption" color="textSecondary">
          {formatDateTime(order.createdAt)} · {tr.common.items(order.itemCount)}
        </AppText>
        <AppText variant="price">{formatPrice(order.total)}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1, gap: spacing.xxs },
  flexGrow: { flexGrow: 1 },
  list: { padding: spacing.lg, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  pressed: { opacity: 0.85 },
  footer: { marginVertical: spacing.lg },
});
