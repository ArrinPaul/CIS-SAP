/**
 * Service for sending Web Push Notifications via Service Worker
 */

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

// In-memory or database-backed active push subscriptions registry
const pushSubscriptions = new Map<string, PushSubscriptionPayload>();

export async function registerPushSubscription(userId: string, subscription: PushSubscriptionPayload) {
  pushSubscriptions.set(userId, subscription);
  return { success: true };
}

export async function unregisterPushSubscription(userId: string) {
  pushSubscriptions.delete(userId);
  return { success: true };
}

export async function sendWebPushNotification(userId: string, payload: PushNotificationPayload) {
  const subscription = pushSubscriptions.get(userId);
  if (!subscription) {
    return { success: false, error: 'No active push subscription for user' };
  }

  // In production, use web-push library with VAPID keys:
  // webpush.sendNotification(subscription, JSON.stringify(payload))
  console.log(`[WebPush] Dispatched push to user ${userId}:`, payload);
  return { success: true, delivered: true };
}
