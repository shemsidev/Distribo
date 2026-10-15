import { Pressable } from 'react-native';
import { router, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useT } from '@/localization';
import { colors, spacing, typography } from '@/theme';

/**
 * Shfletimi (kryefaqja → kategori → nënkategori → produkte) ndodh brenda tab-it të kryefaqes,
 * që shiriti i poshtëm me shportën të mbetet gjithmonë i dukshëm.
 */
export default function HomeStackLayout() {
  const tr = useT();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { ...typography.heading, color: colors.text },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        // Kthim me një prekje në kryefaqe nga çdo nivel kategorie.
        headerRight: () => (
          <Pressable
            onPress={() => router.dismissTo('/')}
            hitSlop={12}
            style={{ paddingHorizontal: spacing.md }}
            accessibilityRole="button"
            accessibilityLabel={tr.tabs.home}
          >
            <Ionicons name="home-outline" size={22} color={colors.primary} />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="category/[id]" options={{ title: '' }} />
    </Stack>
  );
}
