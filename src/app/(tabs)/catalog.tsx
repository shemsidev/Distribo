import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText, Chip, EmptyState, ErrorState, LoadingState, OfflineBanner, SearchBar } from '@/components';
import { ProductCard } from '@/features/catalog/ProductCard';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useLayout } from '@/hooks/useLayout';
import { errorMessage, useT } from '@/localization';
import { catalogApi } from '@/services/api/endpoints';
import { queryKeys } from '@/services/query';
import { colors, maxContentWidth, radius, spacing } from '@/theme';
import type { ProductSort } from '@/types/api';

const PAGE_SIZE = 24;
const GAP = spacing.sm;

/** Kërkimi: emri, kodi ose barkodi, me filtra sipas kategorisë/ofertave dhe renditje. */
export default function SearchScreen() {
  const tr = useT();
  const params = useLocalSearchParams<{ categoryId?: string; promo?: string; focus?: string; t?: string }>();
  const { gridColumns, contentWidth } = useLayout();

  // Filtrat mbahen në gjendjen e tab-it, ndaj ruhen gjatë navigimit ndërmjet ekraneve.
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [promoOnly, setPromoOnly] = useState(false);
  const [sort, setSort] = useState<ProductSort>('name');
  const [sortOpen, setSortOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  // Filtrat e ardhur nga kryefaqja. "t" ndryshon në çdo hapje, që filtri të aplikohet sërish.
  const [appliedNavigation, setAppliedNavigation] = useState<string | undefined>();
  if (params.t !== appliedNavigation) {
    setAppliedNavigation(params.t);
    if (params.categoryId) {
      setCategoryId(Number(params.categoryId));
      setPromoOnly(false);
    } else if (params.promo) {
      setPromoOnly(true);
      setCategoryId(undefined);
    }
  }

  const categories = useQuery({ queryKey: queryKeys.categories, queryFn: () => catalogApi.categories(), staleTime: 10 * 60_000 });

  const filters = useMemo(
    () => ({ search: debouncedSearch || undefined, categoryId, promoOnly: promoOnly || undefined, sort }),
    [debouncedSearch, categoryId, promoOnly, sort],
  );

  const products = useInfiniteQuery({
    queryKey: queryKeys.products(filters),
    queryFn: ({ pageParam, signal }) => catalogApi.products({ ...filters, page: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });

  const items = useMemo(() => products.data?.pages.flatMap((p) => p.items) ?? [], [products.data]);
  const total = products.data?.pages[0]?.totalCount ?? 0;
  const hasFilters = !!debouncedSearch || categoryId !== undefined || promoOnly;
  const columns = gridColumns;
  const tileWidth = (Math.min(contentWidth, maxContentWidth) - spacing.md * 2 - GAP * (columns - 1)) / columns;

  const sortOptions: { value: ProductSort; label: string }[] = [
    { value: 'name', label: tr.catalog.sortName },
    { value: 'name_desc', label: tr.catalog.sortNameDesc },
    { value: 'price_asc', label: tr.catalog.sortPriceAsc },
    { value: 'price_desc', label: tr.catalog.sortPriceDesc },
  ];

  const clearFilters = () => {
    setSearch('');
    setCategoryId(undefined);
    setPromoOnly(false);
  };

  const header = (
    <View style={styles.header}>
      <SearchBar value={search} onChangeText={setSearch} placeholder={tr.catalog.searchPlaceholder} autoFocus={params.focus === '1'} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label={tr.catalog.all} selected={categoryId === undefined && !promoOnly} onPress={() => { setCategoryId(undefined); setPromoOnly(false); }} />
        <Chip label={tr.catalog.offersOnly} icon="pricetag-outline" selected={promoOnly} onPress={() => setPromoOnly((v) => !v)} />
        {categories.data?.map((c) => (
          <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? undefined : c.id)} />
        ))}
      </ScrollView>
      <View style={styles.toolbar}>
        <AppText variant="caption" color="textSecondary">
          {products.data ? tr.catalog.results(total) : ' '}
        </AppText>
        <Pressable onPress={() => setSortOpen((o) => !o)} style={styles.toolButton} accessibilityRole="button" accessibilityLabel={tr.catalog.sort}>
          <Ionicons name="swap-vertical" size={18} color={colors.primary} />
          <AppText variant="caption" color="primary" style={styles.bold}>
            {sortOptions.find((o) => o.value === sort)?.label}
          </AppText>
        </Pressable>
      </View>
      {sortOpen ? (
        <View style={styles.sortMenu}>
          {sortOptions.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => {
                setSort(o.value);
                setSortOpen(false);
              }}
              style={styles.sortItem}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: sort === o.value }}
            >
              <AppText color={sort === o.value ? 'primary' : 'text'} variant={sort === o.value ? 'bodyStrong' : 'body'}>
                {o.label}
              </AppText>
              {sort === o.value ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );

  if (products.isPending || (products.isError && items.length === 0)) {
    return (
      <View style={styles.root}>
        <OfflineBanner />
        <View style={styles.constrained}>{header}</View>
        {products.isPending ? <LoadingState /> : <ErrorState message={errorMessage(products.error)} onRetry={() => products.refetch()} />}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <OfflineBanner />
      <FlatList
        key={`grid-${columns}`}
        data={items}
        numColumns={columns}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => <ProductCard product={item} width={tileWidth} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title={tr.catalog.emptyTitle}
            message={tr.catalog.emptyMessage}
            action={hasFilters ? { title: tr.catalog.clearFilters, onPress: clearFilters } : undefined}
          />
        }
        ListFooterComponent={
          products.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : <View style={styles.footer} />
        }
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        contentContainerStyle={[styles.list, styles.constrained]}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        onEndReached={() => {
          if (products.hasNextPage && !products.isFetchingNextPage) void products.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={products.isRefetching && !products.isFetchingNextPage}
            onRefresh={() => products.refetch()}
            tintColor={colors.primary}
          />
        }
        initialNumToRender={12}
        windowSize={7}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  constrained: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  header: { gap: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.sm },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  bold: { fontWeight: '600' },
  sortMenu: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  sortItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  row: { gap: GAP },
  footer: { height: 48, marginTop: spacing.md },
});
