import { useEffect } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText, EmptyState, ErrorState, LoadingState } from '@/components';
import { errorMessage, useT } from '@/localization';
import { meApi } from '@/services/api/endpoints';
import { queryKeys } from '@/services/query';
import { colors, maxContentWidth, radius, spacing } from '@/theme';
import { formatDateTime } from '@/utils/format';

export default function NotificationsScreen() {
  const tr = useT();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.notifications, queryFn: () => meApi.notifications(1) });

  // Shëno si të lexuara pasi lista është shfaqur.
  const hasUnread = query.data?.items.some((n) => !n.isRead) ?? false;
  useEffect(() => {
    if (!hasUnread) return;
    meApi
      .markNotificationsRead()
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }))
      .catch(() => undefined);
  }, [hasUnread, queryClient]);

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;

  return (
    <FlatList
      style={styles.root}
      data={query.data.items}
      keyExtractor={(n) => String(n.id)}
      contentContainerStyle={[styles.list, query.data.items.length === 0 && styles.grow]}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      ListEmptyComponent={<EmptyState icon="notifications-off-outline" title={tr.profile.noNotifications} />}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.primary} />}
      renderItem={({ item }) => (
        <Pressable
          disabled={!item.orderId}
          onPress={() => item.orderId && router.push({ pathname: '/orders/[id]', params: { id: item.orderId } })}
          style={[styles.item, !item.isRead && styles.unread]}
          accessibilityRole={item.orderId ? 'button' : undefined}
        >
          <Ionicons name="receipt-outline" size={22} color={colors.primary} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{item.title}</AppText>
            <AppText color="textSecondary">{item.body}</AppText>
            <AppText variant="caption" color="textMuted">
              {formatDateTime(item.createdAt)}
            </AppText>
          </View>
          {item.orderId ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1, gap: spacing.xxs },
  grow: { flexGrow: 1 },
  list: { padding: spacing.lg, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
});
