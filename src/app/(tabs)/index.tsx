import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText, Card, ErrorState, LoadingState, OfflineBanner, Screen, SectionHeader, StatusBadge } from '@/components';
import { SectionTab } from '@/components/SectionTab';
import { Ticker } from '@/components/Ticker';
import { useSession } from '@/features/authentication/SessionProvider';
import { CategoryCircle } from '@/features/catalog/CategoryTiles';
import { ProductCard } from '@/features/catalog/ProductCard';
import { useLayout } from '@/hooks/useLayout';
import { errorMessage, useT } from '@/localization';
import { catalogApi } from '@/services/api/endpoints';
import { queryKeys } from '@/services/query';
import { colors, maxContentWidth, radius, spacing } from '@/theme';
import type { OrderSummary, Product } from '@/types/api';
import { formatDate, formatPrice } from '@/utils/format';

/**
 * Kryefaqja: njoftimi, logo, shiriti lëvizës, kategoritë me foto rrethore,
 * ofertat dhe (për klientët e identifikuar) porositë e fundit. E hapur edhe për vizitorët.
 */
export default function HomeScreen() {
  const tr = useT();
  const { status } = useSession();
  const { contentWidth, gridColumns } = useLayout();
  const home = useQuery({ queryKey: queryKeys.home, queryFn: ({ signal }) => catalogApi.home(signal) });

  if (home.isPending) return <Screen edges={['top']}><LoadingState /></Screen>;
  if (home.isError && !home.data) {
    return (
      <Screen edges={['top']}>
        <ErrorState message={errorMessage(home.error)} onRetry={() => home.refetch()} />
      </Screen>
    );
  }

  const data = home.data;
  const width = Math.min(contentWidth, maxContentWidth);
  const columns = Math.max(3, gridColumns + 1);
  const circleSize = Math.min(96, (width - spacing.lg * 2) / columns - spacing.lg);
  const railCardWidth = Math.min(170, (width - spacing.lg * 2 - spacing.md) / 2.3);

  const productRail = (items: Product[]) => (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(p) => String(p.id)}
      renderItem={({ item }) => <ProductCard product={item} width={railCardWidth} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
      ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
    />
  );

  return (
    <Screen
      scroll
      padded={false}
      edges={['top']}
      refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => home.refetch()} tintColor={colors.primary} />}
    >
      <OfflineBanner />
      {data.notice ? (
        <View style={styles.notice}>
          <AppText variant="bodyStrong" align="center">
            {data.notice}
          </AppText>
        </View>
      ) : null}

      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="cube" size={34} color={colors.textOnPrimary} />
          <AppText variant="caption" color="textOnPrimary" style={styles.logoText}>
            DISTRIBO
          </AppText>
        </View>
        {data.greeting ? (
          <AppText variant="bodyStrong" align="center">
            {tr.home.greeting(data.greeting)}
          </AppText>
        ) : (
          <AppText color="textSecondary" align="center">
            {tr.home.browseHint}
          </AppText>
        )}
      </View>

      {data.ticker ? <Ticker text={data.ticker} /> : null}

      <View style={styles.searchWrap}>
        <Pressable
          style={styles.searchButton}
          onPress={() => router.navigate({ pathname: '/catalog', params: { focus: '1', t: String(Date.now()) } })}
          accessibilityRole="search"
        >
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <AppText color="textMuted">{tr.home.searchPlaceholder}</AppText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <SectionTab title={tr.home.categoriesTitle} />
        <View style={styles.circles}>
          {data.categories.map((c) => (
            <CategoryCircle key={c.id} category={c} size={circleSize} />
          ))}
        </View>
      </View>

      {data.offers.length > 0 ? (
        <View style={styles.sectionFlush}>
          <View style={styles.sectionPad}>
            <SectionTab title={tr.home.offers} />
          </View>
          {productRail(data.offers)}
          <Pressable
            onPress={() => router.navigate({ pathname: '/catalog', params: { promo: '1', t: String(Date.now()) } })}
            style={styles.seeAll}
            accessibilityRole="link"
          >
            <AppText variant="bodyStrong" color="primary">
              {tr.common.seeAll}
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}

      {data.frequentlyBought.length > 0 ? (
        <View style={styles.sectionFlush}>
          <View style={styles.sectionPad}>
            <SectionTab title={tr.home.frequent} />
          </View>
          {productRail(data.frequentlyBought)}
        </View>
      ) : null}

      {status === 'signedIn' && data.recentOrders.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={tr.home.recentOrders} action={{ label: tr.common.seeAll, onPress: () => router.navigate('/orders') }} />
          <View style={styles.orderList}>
            {data.recentOrders.map((o) => (
              <RecentOrder key={o.id} order={o} />
            ))}
          </View>
        </View>
      ) : null}
      <View style={styles.bottomSpace} />
    </Screen>
  );
}

function RecentOrder({ order }: { order: OrderSummary }) {
  const tr = useT();
  return (
    <Pressable onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })} accessibilityRole="button">
      <Card style={styles.orderCard}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{tr.orders.number(order.number)}</AppText>
          <AppText variant="caption" color="textSecondary">
            {formatDate(order.createdAt)} · {tr.common.items(order.itemCount)}
          </AppText>
        </View>
        <View style={styles.orderRight}>
          <AppText variant="price">{formatPrice(order.total)}</AppText>
          <StatusBadge status={order.status} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notice: { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  brand: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg, backgroundColor: colors.surface },
  logo: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  logoText: { fontWeight: '800', letterSpacing: 1 },
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionFlush: { marginTop: spacing.xl, gap: spacing.md },
  sectionPad: { paddingHorizontal: spacing.lg },
  circles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  rail: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  seeAll: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 2, paddingHorizontal: spacing.lg },
  orderList: { gap: spacing.md },
  orderCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  orderRight: { alignItems: 'flex-end', gap: spacing.xs },
  bottomSpace: { height: spacing.xxl },
});
