import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { AppText } from '@/components/AppText';
import { ProductImage } from '@/components/ProductImage';
import { cardShadow, colors, radius, spacing } from '@/theme';
import type { Category } from '@/types/api';

function openCategory(category: Category) {
  router.push({ pathname: '/category/[id]', params: { id: String(category.id) } });
}

/** Kategori kryesore: foto rrethore me emrin poshtë (kryefaqja). */
export function CategoryCircle({ category, size }: { category: Category; size: number }) {
  return (
    <Pressable
      onPress={() => openCategory(category)}
      style={({ pressed }) => [styles.circleItem, { width: size + spacing.lg }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={category.name}
    >
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        <ProductImage uri={category.imageUrl} style={styles.circleImage} />
      </View>
      <AppText variant="caption" color="textSecondary" align="center" numberOfLines={2}>
        {category.name}
      </AppText>
    </Pressable>
  );
}

/** Kartelë me foto dhe emrin në shirit të kuq (nënkategoritë dhe kreu i kategorisë). */
export function CategoryBanner({ category, onPress, large }: { category: Category; onPress?: () => void; large?: boolean }) {
  const content = (
    <>
      <View style={[styles.bannerImage, large && styles.bannerImageLarge]}>
        <ProductImage uri={category.imageUrl} style={styles.fill} />
      </View>
      <View style={styles.bar}>
        <AppText variant={large ? 'bodyStrong' : 'body'} color="textOnPrimary" align="center" numberOfLines={1}>
          {category.name}
        </AppText>
      </View>
    </>
  );

  if (!onPress) return <View style={styles.banner}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.banner, styles.flex, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={category.name}
    >
      {content}
    </Pressable>
  );
}

export { openCategory };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  circleItem: { alignItems: 'center', gap: spacing.xs },
  circle: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  circleImage: { width: '100%', height: '100%', backgroundColor: colors.surface, borderRadius: 0 },
  banner: { backgroundColor: colors.surface, borderRadius: radius.sm, overflow: 'hidden', ...cardShadow },
  bannerImage: { height: 120, padding: spacing.sm },
  bannerImageLarge: { height: 150 },
  fill: { width: '100%', height: '100%', backgroundColor: colors.surface },
  bar: { backgroundColor: colors.primary, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
});
