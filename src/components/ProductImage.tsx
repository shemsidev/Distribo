import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { resolveAssetUrl } from '@/constants/config';
import { colors, radius } from '@/theme';

interface ProductImageProps {
  uri: string | null | undefined;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Foto produkti me ngarkim gradual, cache në disk dhe vend-mbajtës kur mungon. */
export function ProductImage({ uri, size, style }: ProductImageProps) {
  const source = resolveAssetUrl(uri);
  const dimension = size ? { width: size, height: size } : styles.fill;

  return (
    <View style={[styles.frame, dimension, style]}>
      {source ? (
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={source}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Ionicons name="cube-outline" size={size ? size * 0.4 : 32} color={colors.textMuted} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: { width: '100%', aspectRatio: 1 },
});
