import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { colors, radius, spacing, touchTarget, type ColorToken } from '@/theme';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'dark';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<Variant, { bg: string; fg: ColorToken; border: string }> = {
  primary: { bg: colors.primary, fg: 'textOnPrimary', border: colors.primary },
  secondary: { bg: colors.surface, fg: 'primary', border: colors.primary },
  danger: { bg: colors.surface, fg: 'danger', border: colors.danger },
  ghost: { bg: 'transparent', fg: 'primary', border: 'transparent' },
  dark: { bg: colors.dark, fg: 'textOnPrimary', border: colors.dark },
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  disabled,
  icon,
  ...rest
}: ButtonProps) {
  const v = variantStyles[variant];
  const isDisabled = !!disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border },
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors[v.fg]} />
      ) : (
        <View style={styles.content}>
          {icon}
          <AppText variant="bodyStrong" color={v.fg}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
