import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

const TRACK_WIDTH = 10_000;

/** Shirit i verdhë me tekst që lëviz (njoftime për klientët). Ndalon kur "Reduce motion" është aktiv. */
export function Ticker({ text }: { text: string }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [offset] = useState(() => new Animated.Value(0));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!containerWidth || !textWidth || reduceMotion) return;
    offset.setValue(containerWidth);
    const loop = Animated.loop(
      Animated.timing(offset, {
        toValue: -textWidth,
        duration: (containerWidth + textWidth) * 18,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [containerWidth, textWidth, reduceMotion, offset]);

  if (reduceMotion) {
    return (
      <View style={[styles.bar, styles.staticBar]} accessibilityRole="text">
        <Text style={styles.text}>{text}</Text>
      </View>
    );
  }

  return (
    <View style={styles.bar} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)} accessibilityRole="text" accessibilityLabel={text}>
      {/* Pista e gjerë lejon që teksti të matet me gjerësinë e plotë, pa u prerë. */}
      <Animated.View style={[styles.track, { transform: [{ translateX: offset }] }]}>
        <Text style={styles.text} numberOfLines={1} onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.accent, overflow: 'hidden', height: 36, justifyContent: 'center' },
  staticBar: { height: undefined, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  track: { position: 'absolute', left: 0, width: TRACK_WIDTH, flexDirection: 'row', alignItems: 'center' },
  text: { ...typography.bodyStrong, color: colors.text },
});
