import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';

export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}
