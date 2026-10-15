import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View, type RefreshControlProps, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, maxContentWidth, spacing } from '@/theme';

export interface ScreenProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
  /** Skajet ku aplikohet safe area; ekranet me header/tab bar zakonisht nuk kanë nevojë. */
  edges?: Edge[];
  refreshControl?: ReactElement<RefreshControlProps>;
  /** Përmbajtje e fiksuar poshtë (p.sh. butoni i porosisë). */
  footer?: React.ReactNode;
}

/** Kontejner i ekranit: sfond i qëndrueshëm, gjerësi maksimale në tablet/web dhe safe area. */
export function Screen({
  scroll = false,
  padded = true,
  edges = [],
  style,
  children,
  refreshControl,
  footer,
  ...rest
}: ScreenProps) {
  const contentStyle = [styles.constrained, padded && styles.padded, style];

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, contentStyle]} {...rest}>
          {children}
        </View>
      )}
      {footer ? (
        <View style={styles.footer}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  constrained: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' },
  padded: { padding: spacing.lg },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  footerInner: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', gap: spacing.sm },
});
