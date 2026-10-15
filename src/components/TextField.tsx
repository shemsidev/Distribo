import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useT } from '@/localization';
import { colors, radius, spacing, touchTarget, typography } from '@/theme';

import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  /** Shton butonin shfaq/fshih për fushat e fjalëkalimit. */
  secureToggle?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, secureToggle = false, secureTextEntry, style, onFocus, onBlur, ...rest },
  ref,
) {
  const tr = useT();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const isSecure = secureToggle ? hidden : secureTextEntry;

  return (
    <View style={styles.container}>
      <AppText variant="caption" color="textSecondary" style={styles.label}>
        {label}
      </AppText>
      <View style={[styles.inputRow, focused && styles.focused, !!error && styles.errorBorder]}>
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isSecure}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {secureToggle && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? tr.form.showPassword : tr.form.hidePassword}
            style={styles.toggle}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
      {!!error && (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget + 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  focused: { borderColor: colors.primary },
  errorBorder: { borderColor: colors.danger },
  input: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.sm },
  toggle: { paddingLeft: spacing.sm },
});
