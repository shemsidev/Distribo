import { Platform, type ViewStyle } from 'react-native';

export { colors } from './colors';
export type { ColorToken } from './colors';
export { maxContentWidth, radius, spacing, touchTarget } from './spacing';
export { typography } from './typography';
export type { TypographyVariant } from './typography';

/** Hije e lehtë për kartelat, e njëjtë në iOS, Android dhe web. */
export const cardShadow: ViewStyle = Platform.select<ViewStyle>({
  web: { boxShadow: '0 1px 3px rgba(16, 24, 40, 0.08)' },
  android: { elevation: 1 },
  default: {
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
}) as ViewStyle;
