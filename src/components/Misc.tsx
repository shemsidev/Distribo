import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useOnline } from '@/hooks/useOnline';
import { useT } from '@/localization';
import { cardShadow, colors, radius, spacing, touchTarget, typography } from '@/theme';
import type { OrderStatus } from '@/types/api';

import { AppText } from './AppText';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading">{title}</AppText>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="link">
          <AppText variant="bodyStrong" color="primary">
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress: () => void; icon?: IoniconName }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon ? <Ionicons name={icon} size={16} color={selected ? colors.textOnPrimary : colors.primary} /> : null}
      <AppText variant="caption" color={selected ? 'textOnPrimary' : 'text'} style={styles.chipText}>
        {label}
      </AppText>
    </Pressable>
  );
}

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  onFocus?: () => void;
}

export function SearchBar({ value, onChangeText, placeholder, autoFocus, onSubmit, onFocus }: SearchBarProps) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        onFocus={onFocus}
        accessibilityLabel={placeholder}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="×">
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const statusColors: Record<OrderStatus, { bg: string; fg: 'warning' | 'primary' | 'success' | 'danger' | 'textSecondary' }> = {
  Pending: { bg: colors.warningLight, fg: 'warning' },
  Confirmed: { bg: colors.primaryLight, fg: 'primary' },
  Preparing: { bg: colors.primaryLight, fg: 'primary' },
  InTransit: { bg: colors.accentLight, fg: 'warning' },
  Delivered: { bg: colors.successLight, fg: 'success' },
  Cancelled: { bg: colors.dangerLight, fg: 'danger' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tr = useT();
  const c = statusColors[status] ?? { bg: colors.border, fg: 'textSecondary' as const };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <AppText variant="caption" color={c.fg} style={styles.badgeText}>
        {tr.status[status] ?? status}
      </AppText>
    </View>
  );
}

export function KeyValue({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <View style={styles.kv}>
      <AppText color="textSecondary" variant={strong ? 'bodyStrong' : 'body'}>
        {label}
      </AppText>
      {typeof value === 'string' ? (
        <AppText variant={strong ? 'price' : 'body'} style={styles.kvValue}>
          {value}
        </AppText>
      ) : (
        value
      )}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

/** Shirit që shfaqet kur pajisja nuk ka internet. */
export function OfflineBanner({ message }: { message?: string }) {
  const online = useOnline();
  const tr = useT();
  if (online) return null;
  return (
    <View style={styles.offline} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
      <AppText variant="caption" color="warning" style={styles.flex}>
        {message ?? tr.common.offline}
      </AppText>
    </View>
  );
}

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'warning' | 'danger' | 'success'; children: ReactNode }) {
  const map = {
    info: { bg: colors.primaryLight, fg: 'primary', icon: 'information-circle-outline' },
    warning: { bg: colors.warningLight, fg: 'warning', icon: 'alert-circle-outline' },
    danger: { bg: colors.dangerLight, fg: 'danger', icon: 'close-circle-outline' },
    success: { bg: colors.successLight, fg: 'success', icon: 'checkmark-circle-outline' },
  } as const;
  const c = map[kind];
  return (
    <View style={[styles.notice, { backgroundColor: c.bg }]}>
      <Ionicons name={c.icon} size={18} color={colors[c.fg]} />
      <AppText variant="caption" color={c.fg} style={styles.flex}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...cardShadow,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '600' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.sm },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeText: { fontWeight: '700' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  kvValue: { flexShrink: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  notice: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
