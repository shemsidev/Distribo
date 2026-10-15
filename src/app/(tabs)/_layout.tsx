import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useCart } from '@/features/cart/CartProvider';
import { cartCount } from '@/features/cart/cartReducer';
import { useT } from '@/localization';
import { colors, typography } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconName, focusedName: IoniconName) {
  return function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? focusedName : name} size={size} color={color} />;
  };
}

/** Shiriti i poshtëm i errët (si te muci.al): kryefaqja, kërkimi, shporta, porositë dhe llogaria. */
export default function TabsLayout() {
  const tr = useT();
  const { state } = useCart();
  const count = cartCount(state);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.textOnPrimary,
        tabBarInactiveTintColor: colors.darkMuted,
        tabBarActiveBackgroundColor: colors.dark,
        tabBarStyle: { backgroundColor: colors.dark, borderTopColor: colors.dark },
        tabBarLabelStyle: { fontWeight: '600' },
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { ...typography.heading, color: colors.text },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: tr.tabs.home, headerShown: false, tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tabs.Screen name="catalog" options={{ title: tr.tabs.search, tabBarIcon: tabIcon('search-outline', 'search') }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: tr.tabs.cart,
          tabBarIcon: tabIcon('cart-outline', 'cart'),
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.textOnPrimary },
        }}
      />
      <Tabs.Screen name="orders" options={{ title: tr.tabs.orders, tabBarIcon: tabIcon('receipt-outline', 'receipt') }} />
      <Tabs.Screen name="profile" options={{ title: tr.tabs.account, tabBarIcon: tabIcon('person-outline', 'person') }} />
    </Tabs>
  );
}
