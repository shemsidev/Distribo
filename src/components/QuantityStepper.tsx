import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, spacing } from '@/theme';
import { formatQuantity } from '@/utils/format';

import { AppText } from './AppText';

interface QuantityStepperProps {
  value: number;
  unit?: string;
  onIncrease: () => void;
  onDecrease: () => void;
  compact?: boolean;
  label?: string;
}

export function QuantityStepper({ value, unit, onIncrease, onDecrease, compact, label }: QuantityStepperProps) {
  const size = compact ? 34 : 44;
  return (
    <View
      style={[styles.row, { height: size }]}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${formatQuantity(value)} ${unit ?? ''}`.trim() }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'increment' ? onIncrease() : onDecrease())}
    >
      <Pressable
        onPress={onDecrease}
        hitSlop={6}
        style={({ pressed }) => [styles.button, { width: size }, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="−"
      >
        <Ionicons name={value <= 0 ? 'trash-outline' : 'remove'} size={compact ? 18 : 22} color={colors.primary} />
      </Pressable>
      <View style={styles.value}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {formatQuantity(value)}
        </AppText>
        {unit && !compact ? (
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {unit}
          </AppText>
        ) : null}
      </View>
      <Pressable
        onPress={onIncrease}
        hitSlop={6}
        style={({ pressed }) => [styles.button, { width: size }, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="+"
      >
        <Ionicons name="add" size={compact ? 18 : 22} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  button: { height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  pressed: { opacity: 0.7 },
  value: { flex: 1, minWidth: 44, alignItems: 'center', paddingHorizontal: spacing.xs },
});
