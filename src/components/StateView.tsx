import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useT } from '@/localization';
import { colors, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export function LoadingState({ message }: { message?: string }) {
  const tr = useT();
  const text = message ?? tr.common.loading;
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={text}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText color="textSecondary">{text}</AppText>
    </View>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  const tr = useT();
  return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
      <AppText variant="heading" align="center">
        {title ?? tr.common.errorTitle}
      </AppText>
      <AppText color="textSecondary" align="center">
        {message ?? tr.common.errorGeneric}
      </AppText>
      {onRetry && <Button title={tr.common.retry} variant="secondary" onPress={onRetry} />}
    </View>
  );
}

export interface EmptyStateProps {
  icon?: IoniconName;
  title: string;
  message?: string;
  action?: { title: string; onPress: () => void };
}

export function EmptyState({ icon = 'file-tray-outline', title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={48} color={colors.textMuted} />
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {!!message && (
        <AppText color="textSecondary" align="center">
          {message}
        </AppText>
      )}
      {action && <Button title={action.title} onPress={action.onPress} />}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});
