import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import { formatPrice } from '@/utils/format';

import { AppText } from './AppText';

interface PriceTagProps {
  price: number;
  promoPrice?: number | null;
  unit?: string;
  size?: 'md' | 'lg';
}

/** Çmimi i klientit; nëse ka ofertë, çmimi i vjetër shfaqet i vizatuar. */
export function PriceTag({ price, promoPrice, unit, size = 'md' }: PriceTagProps) {
  const hasPromo = promoPrice != null && promoPrice < price;
  const main = hasPromo ? promoPrice : price;

  return (
    <View style={styles.row}>
      <AppText
        variant={size === 'lg' ? 'title' : 'price'}
        color={hasPromo ? 'primary' : 'text'}
        accessibilityLabel={`${formatPrice(main)}${unit ? ` / ${unit}` : ''}`}
      >
        {formatPrice(main)}
      </AppText>
      {unit ? (
        <AppText variant="caption" color="textSecondary">
          / {unit}
        </AppText>
      ) : null}
      {hasPromo ? (
        <AppText variant="caption" color="textMuted" style={styles.strike}>
          {formatPrice(price)}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: spacing.xs },
  strike: { textDecorationLine: 'line-through' },
});
