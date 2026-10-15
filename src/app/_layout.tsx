import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components';
import { CartProvider } from '@/features/cart/CartProvider';
import { SessionProvider, useSession } from '@/features/authentication/SessionProvider';
import { PushBridge } from '@/features/notifications/PushBridge';
import { LocalizationProvider, useT } from '@/localization';
import { queryClient } from '@/services/query';
import { colors, typography } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LocalizationProvider>
          <SessionProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </ToastProvider>
          </SessionProvider>
        </LocalizationProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Katalogu, kategoritë, produktet dhe shporta janë të hapura për vizitorët.
 * Identifikimi kërkohet vetëm për dërgimin e porosisë dhe faqet e llogarisë.
 */
function RootNavigator() {
  const { status, user } = useSession();
  const tr = useT();

  if (status === 'loading') return null;
  SplashScreen.hide();

  const signedIn = status === 'signedIn' && !!user;

  return (
    <CartProvider key={user?.userId ?? 0} userId={user?.userId ?? 0}>
      {signedIn ? <PushBridge /> : null}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { ...typography.heading, color: colors.text },
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="category/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen
          name="products/[id]"
          options={{
            // Dritarja "Porosi" hapet mbi faqen aktuale, si te muci.al.
            presentation: 'transparentModal',
            animation: Platform.OS === 'web' ? 'none' : 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen name="login" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="register" options={{ headerShown: true, title: '' }} />
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="checkout" options={{ headerShown: true, title: tr.checkout.title }} />
          <Stack.Screen name="orders/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="profile/change-password" options={{ headerShown: true, title: tr.profile.changePassword }} />
          <Stack.Screen name="profile/notifications" options={{ headerShown: true, title: tr.profile.notificationHistory }} />
        </Stack.Protected>
      </Stack>
    </CartProvider>
  );
}
