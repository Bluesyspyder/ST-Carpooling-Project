"use client";
import { useEffect, useState } from 'react';
import { Network } from '@capacitor/network';

/**
 * Cross-platform online/offline status. Uses @capacitor/network on native
 * (navigator.onLine is unreliable inside a WebView) and the browser API on web.
 */
export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let listenerHandle;

    Network.getStatus().then((status) => setIsOnline(status.connected));
    Network.addListener('networkStatusChange', (status) => setIsOnline(status.connected)).then(
      (handle) => { listenerHandle = handle; }
    );

    return () => {
      listenerHandle?.remove();
    };
  }, []);

  return isOnline;
}
