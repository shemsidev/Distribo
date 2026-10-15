import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Ruajtja e token-ave:
 * - iOS/Android: refresh token-i në SecureStore (Keychain / Keystore), kurrë në AsyncStorage.
 * - Web: refresh token-i është në cookie HttpOnly që e vendos API-ja; këtu nuk ruhet asgjë.
 * Access token-i mbahet vetëm në memorie (jetëgjatësi 15 min).
 */
const REFRESH_KEY = 'distribo.refreshToken';

let accessToken: string | null = null;

export const tokenStorage = {
  getAccessToken: () => accessToken,
  setAccessToken: (token: string | null) => {
    accessToken = token;
  },

  async getRefreshToken(): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    return SecureStore.getItemAsync(REFRESH_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    if (Platform.OS === 'web' || !token) return;
    await SecureStore.setItemAsync(REFRESH_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  },

  async clear(): Promise<void> {
    accessToken = null;
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};
