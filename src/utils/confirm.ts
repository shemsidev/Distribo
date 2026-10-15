import { Alert, Platform } from 'react-native';

import { t } from '@/localization';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  destructive?: boolean;
}

/** Dialog konfirmimi për veprime të rëndësishme. Kthen `true` nëse përdoruesi konfirmon. */
export function confirm({
  title,
  message,
  confirmText,
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: t().common.cancel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmText ?? t().common.confirm,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
