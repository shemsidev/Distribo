import { useWindowDimensions } from 'react-native';

/** Përshtatja për ekrane të ndryshme: telefon, tablet dhe web. */
export function useLayout() {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 1200);
  const gridColumns = contentWidth >= 1000 ? 5 : contentWidth >= 760 ? 4 : contentWidth >= 520 ? 3 : 2;
  return { width, contentWidth, gridColumns, isWide: width >= 760 };
}
