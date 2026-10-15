import { AppState, Platform, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';

import { ApiError, NetworkError } from './api/errors';

// Gjendja e rrjetit: pa internet, pyetjet pushojnë dhe rinisin automatikisht kur kthehet lidhja.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  }),
);

// Rifresko të dhënat kur aplikacioni kthehet në plan të parë.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      // Riprovo vetëm gabimet e rrjetit/serverit, jo 4xx (p.sh. 404 ose 403).
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2 || (error instanceof NetworkError && failureCount < 3);
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    // Asnjë veprim ndryshues (p.sh. POST i porosisë) nuk riprovohet automatikisht.
    mutations: { retry: false },
  },
});

export const queryKeys = {
  home: ['home'] as const,
  categories: ['categories'] as const,
  category: (id: number) => ['category', id] as const,
  products: (params: object) => ['products', params] as const,
  product: (id: number) => ['product', id] as const,
  pricing: (items: object) => ['pricing', items] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['order', id] as const,
  addresses: ['addresses'] as const,
  notifications: ['notifications'] as const,
};
