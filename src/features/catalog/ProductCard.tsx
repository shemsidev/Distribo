import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText } from '@/components/AppText';
import { ProductImage } from '@/components/ProductImage';
import { useCart } from '@/features/cart/CartProvider';
import { useT } from '@/localization';
import { cardShadow, colors, radius, spacing } from '@/theme';
import type { Product } from '@/types/api';
import { formatPrice, formatQuantity } from '@/utils/format';

interface ProductCardProps {
  product: Product;
  width?: number;
}

/**
 * Kartela e produktit: foto, çmimi me shkronja të trasha dhe emri në shirit të kuq.
 * Prekja hap dritaren "Porosi" për zgjedhjen e sasisë.
 */
export const ProductCard = memo(function ProductCard({ product, width }: ProductCardProps) {
  const tr = useT();
  const { quantityOf } = useCart();
  const inCart = quantityOf(product.id);
  const hasPromo = product.promoPrice != null && product.promoPrice < product.price;
  const outOfStock = !product.stock.inStock;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/products/[id]', params: { id: String(product.id) } })}
      style={({ pressed }) => [styles.card, width ? { width } : styles.flex, pressed && styles.pressed]}
      accessibilityLabel={`${product.name}, ${formatPrice(hasPromo ? product.promoPrice! : product.price)}`}
    >
      <View style={styles.imageWrap}>
        <ProductImage uri={product.imageUrl} style={styles.image} />
        {hasPromo ? (
          <View style={styles.promoBadge}>
            <AppText variant="caption" color="textOnPrimary" style={styles.bold}>
              -{Math.round((1 - product.promoPrice! / product.price) * 100)}%
            </AppText>
          </View>
        ) : null}
        {inCart > 0 ? (
          <View style={styles.cartBadge} accessibilityLabel={tr.product.inCart(formatQuantity(inCart))}>
            <Ionicons name="cart" size={12} color={colors.textOnPrimary} />
            <AppText variant="caption" color="textOnPrimary" style={styles.bold}>
              {formatQuantity(inCart)}
            </AppText>
          </View>
        ) : null}
        {outOfStock ? (
          <View style={styles.outOfStock}>
            <AppText variant="caption" color="textOnPrimary" style={styles.bold}>
              {tr.product.outOfStock}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.priceRow}>
        <AppText variant="price" color={hasPromo ? 'primary' : 'text'}>
          {formatPrice(hasPromo ? product.promoPrice! : product.price)}
        </AppText>
        {hasPromo ? (
          <AppText variant="caption" color="textMuted" style={styles.strike}>
            {formatPrice(product.price)}
          </AppText>
        ) : null}
      </View>
      <View style={styles.nameBar}>
        <AppText variant="caption" color="textOnPrimary" align="center" numberOfLines={2} style={styles.name}>
          {product.name}
        </AppText>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    overflow: 'hidden',
    ...cardShadow,
  },
  pressed: { opacity: 0.85 },
  imageWrap: { padding: spacing.sm, alignItems: 'center' },
  image: {
    width: '80%',
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: spacing.xs,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  strike: { textDecorationLine: 'line-through' },
  nameBar: {
    backgroundColor: colors.primary,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  name: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  promoBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  cartBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  outOfStock: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
    backgroundColor: colors.dark,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
