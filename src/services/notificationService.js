import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Notification Service
 * Supports:
 * 1. Native Android Notification Center (via Capacitor LocalNotifications)
 * 2. Web / PWA Push Notifications (via ServiceWorker / Notification API)
 */
class NotificationService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.supported = this.isNative || ('Notification' in window);
    this.permission = this.isNative ? 'prompt' : (this.supported ? Notification.permission : 'denied');
    this.channelCreated = false;

    // Set up native Android notification channel
    if (this.isNative) {
      this.initNativeChannel();
    }
  }

  async initNativeChannel() {
    try {
      await LocalNotifications.createChannel({
        id: 'log-notifications',
        name: 'Log. Directives & Alerts',
        description: 'Challenges, reminders, and streak updates for Log.',
        importance: 5, // High importance (heads-up banner + status bar icon + sound)
        visibility: 1, // Visible on lock screen
        vibration: true
      });
      this.channelCreated = true;
    } catch (err) {
      console.warn('[Notif] Could not create native channel:', err);
    }
  }

  async requestPermission() {
    if (this.isNative) {
      try {
        const check = await LocalNotifications.checkPermissions();
        if (check.display === 'granted') {
          this.permission = 'granted';
          return true;
        }
        const req = await LocalNotifications.requestPermissions();
        this.permission = req.display === 'granted' ? 'granted' : 'denied';
        return this.permission === 'granted';
      } catch (err) {
        console.warn('[Notif] Native permission error:', err);
        return false;
      }
    }

    if (!this.supported) {
      console.warn('[Notif] Web Notifications not supported in this browser.');
      return false;
    }
    if (this.permission === 'granted') return true;
    if (this.permission === 'denied') {
      console.warn('[Notif] Permission previously denied. Reset in browser settings.');
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      this.permission = perm;
      return perm === 'granted';
    } catch (err) {
      console.warn('[Notif] requestPermission error:', err);
      return false;
    }
  }

  async send(title, options = {}) {
    // 1. Native Android Notification Center
    if (this.isNative) {
      try {
        const hasPerm = await this.requestPermission();
        if (!hasPerm) {
          console.log('[Notif] Native permission not granted.');
          return;
        }

        if (!this.channelCreated) {
          await this.initNativeChannel();
        }

        const notifId = Math.floor(Math.random() * 2147483647);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notifId,
              title: title,
              body: options.body || '',
              channelId: 'log-notifications',
              schedule: { at: new Date(Date.now() + 100) },
              smallIcon: 'ic_launcher'
            }
          ]
        });
        console.log('[Notif] Native notification posted to Android center:', title);
        return;
      } catch (err) {
        console.warn('[Notif] Native notification schedule failed:', err);
      }
    }

    // 2. Web / PWA fallback
    if (this.supported) this.permission = Notification.permission;

    if (!this.supported || this.permission !== 'granted') {
      console.log(`[Notif] Skipped (permission=${this.permission}):`, title);
      return;
    }

    const defaultOptions = {
      icon: '/log-logo.png',
      badge: '/log-logo.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      tag: 'log-directive'
    };

    const finalOptions = { ...defaultOptions, ...options };

    // ServiceWorker showNotification
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, finalOptions);
          console.log('[Notif] Sent via ServiceWorker:', title);
          return;
        }
      } catch (err) {
        console.warn('[Notif] SW notification failed, falling back:', err);
      }
    }

    // Fallback: direct Notification API
    try {
      const n = new Notification(title, finalOptions);
      console.log('[Notif] Sent via Notification API:', title);
      n.onerror = (e) => console.warn('[Notif] Notification error:', e);
    } catch (err) {
      console.warn('[Notif] Direct notification failed:', err);
    }
  }
}

export const notifier = new NotificationService();
