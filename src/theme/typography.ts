import type { TextStyle } from 'react-native';

export const typography = {
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  price: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
