import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { meApi } from '@/services/api/endpoints';

export type PushRegistrationResult = 'registered' | 'unsupported' | 'denied' | 'failed';

let registeredToken: string | null = null;

// Njoftimet shfaqen edhe kur aplikacioni është i hapur.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Push-et punojnë vetëm në pajisje reale me një build të aplikacionit (development ose production)
 * dhe me një projekt EAS. Expo Go në Android nuk i mbështet që nga SDK 53.
 */
export function isPushSupported(): boolean {
  if (Platform.OS === 'web' || !Device.isDevice) return false;
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (isExpoGo && Platform.OS === 'android') return false;
  return !!projectId();
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function registerForPush(): Promise<PushRegistrationResult> {
  if (!isPushSupported()) return 'unsupported';
  try {
    if (Platform.OS === 'android') {
      // Kanali duhet të ekzistojë para kërkimit të lejes në Android 13+.
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Porositë',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return 'denied';

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    await meApi.registerPushToken(data, Platform.OS);
    registeredToken = data;
    return 'registered';
  } catch {
    return 'failed';
  }
}

/** Çregjistron pajisjen gjatë daljes, që njoftimet të mos shkojnë te llogaria e mëparshme. */
export async function unregisterPushToken(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await meApi.unregisterPushToken(token);
}

// ---------- Gjendja e regjistrimit, për ta shfaqur te Profili ----------

let pushStatus: PushRegistrationResult | 'idle' = 'idle';
const listeners = new Set<() => void>();

export function setPushStatus(status: PushRegistrationResult): void {
  pushStatus = status;
  listeners.forEach((l) => l());
}

export function subscribePushStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPushStatus(): PushRegistrationResult | 'idle' {
  return pushStatus;
}
