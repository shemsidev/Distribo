import { useEffect } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/services/query';
import { getNotifications, registerForPush, setPushStatus } from '@/services/notifications/push';

/**
 * Regjistron pajisjen për push pas hyrjes dhe hap porosinë kur përdoruesi prek një njoftim.
 * Nuk shfaq ndërfaqe.
 */
export function PushBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    registerForPush().then((result) => {
      if (active) setPushStatus(result);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications) return;

    const openOrder = (data: unknown) => {
      const orderId = (data as { orderId?: string } | undefined)?.orderId;
      if (orderId) router.push({ pathname: '/orders/[id]', params: { id: orderId } });
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openOrder(response.notification.request.content.data);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) =>
      openOrder(response.notification.request.content.data),
    );
    // Njoftim i ri në plan të parë: rifresko porositë dhe listën e njoftimeve.
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      void queryClient.invalidateQueries({ queryKey: ['order'] });
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, [queryClient]);

  return null;
}
