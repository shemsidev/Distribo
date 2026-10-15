import { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { EmptyState, ErrorState, LoadingState, OfflineBanner } from '@/components';
import { CategoryBanner, openCategory } from '@/features/catalog/CategoryTiles';
import { ProductCard } from '@/features/catalog/ProductCard';
import { useLayout } from '@/hooks/useLayout';
import { errorMessage, useT } from '@/localization';
import { catalogApi } from '@/services/api/endpoints';
import { queryKeys } from '@/services/query';
import { colors, maxContentWidth, spacing } from '@/theme';
import type { Category, Product } from '@/types/api';

const PAGE_SIZE = 24;
const GAP = spacing.sm;

/**
 * Faqja e kategorisë: kreu me foto dhe emër në shirit të kuq. Nëse kategoria ka nënkategori,
 * shfaqen ato si kartela; përndryshe shfaqen produktet (me ngarkim gradual).
 */
export default function CategoryScreen() {
  const tr = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  const { contentWidth, gridColumns } = useLayout();

  const detail = useQuery({ queryKey: queryKeys.category(categoryId), queryFn: () => catalogApi.category(categoryId), staleTime: 5 * 60_000 });
  const hasChildren = (detail.data?.children.length ?? 0) > 0;

  const products = useInfiniteQuery({
    queryKey: queryKeys.products({ categoryId }),
    queryFn: ({ pageParam, signal }) => catalogApi.products({ categoryId, page: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: detail.isSuccess && !hasChildren,
  });
  const items = useMemo(() => products.data?.pages.flatMap((p) => p.items) ?? [], [products.data]);

  if (detail.isPending) return <LoadingState />;
  if (detail.isError) return <ErrorState message={errorMessage(detail.error)} onRetry={() => detail.refetch()} />;

  const { category, children } = detail.data;
  const width = Math.min(contentWidth, maxContentWidth) - spacing.md * 2;
  const columns = hasChildren ? Math.max(2, gridColumns - 1) : gridColumns;
  const tileWidth = (width - GAP * (columns - 1)) / columns;

  const header = (
    <View style={styles.header}>
      <CategoryBanner category={category} large />
    </View>
  );

  const title = <Stack.Screen options={{ title: category.name }} />;

  if (hasChildren) {
    return (
      <View style={styles.root}>
        {title}
        <OfflineBanner />
        <FlatList<Category>
          key={`sub-${columns}`}
          data={children}
          numColumns={columns}
          keyExtractor={(c) => String(c.id)}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <View style={{ width: tileWidth }}>
              <CategoryBanner category={item} onPress={() => openCategory(item)} />
            </View>
          )}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={detail.isRefetching} onRefresh={() => detail.refetch()} tintColor={colors.primary} />}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {title}
      <OfflineBanner />
      <FlatList<Product>
        key={`products-${columns}`}
        data={items}
        numColumns={columns}
        keyExtractor={(p) => String(p.id)}
        ListHeaderComponent={header}
        renderItem={({ item }) => <ProductCard product={item} width={tileWidth} />}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          products.isPending ? (
            <LoadingState />
          ) : products.isError ? (
            <ErrorState message={errorMessage(products.error)} onRetry={() => products.refetch()} />
          ) : (
            <EmptyState icon="cube-outline" title={tr.catalog.emptyTitle} />
          )
        }
        ListFooterComponent={products.isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
        onEndReached={() => {
          if (products.hasNextPage && !products.isFetchingNextPage) void products.fetchNextPage();
        }}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl refreshing={products.isRefetching && !products.isFetchingNextPage} onRefresh={() => products.refetch()} tintColor={colors.primary} />
        }
        initialNumToRender={12}
        windowSize={7}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', paddingBottom: spacing.xxl },
  header: { marginBottom: GAP },
  row: { gap: GAP },
  footer: { marginVertical: spacing.lg },
});
