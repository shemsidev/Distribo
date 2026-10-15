import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

/** Titull seksioni me etiketë të kuqe dhe vijë poshtë (p.sh. "Kategoritë"). */
export function SectionTab({ title }: { title: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.tab}>
        <AppText variant="caption" color="textOnPrimary" style={styles.text}>
          {title}
        </AppText>
      </View>
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: colors.primary },
  tab: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopRightRadius: 2,
  },
  tail: {
    width: 0,
    height: 0,
    borderBottomWidth: 26,
    borderBottomColor: colors.primary,
    borderRightWidth: 10,
    borderRightColor: 'transparent',
  },
  text: { fontWeight: '700' },
});
