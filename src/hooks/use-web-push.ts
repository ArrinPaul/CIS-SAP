'use client';

import { useState, useEffect } from 'react';

export function useWebPush() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = async () => {
    if (!isSupported) return false;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission was not granted');
      }

      // Convert VAPID public key if available, or subscribe
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // In full VAPID setups: applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.warn('Web push subscription failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { isSupported, isSubscribed, loading, subscribe };
}
