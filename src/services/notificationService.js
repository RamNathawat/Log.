/**
 * Notification Service
 * Handles requesting permissions and firing native push notifications.
 * Degrades gracefully if denied or unsupported.
 *
 * macOS Note: You must also grant permission in System Settings →
 * Notifications → [your browser] for banners to appear.
 */
class NotificationService {
  constructor() {
    this.supported = 'Notification' in window;
    this.permission = this.supported ? Notification.permission : 'denied';
  }

  async requestPermission() {
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
      if (perm !== 'granted') {
        console.warn('[Notif] Permission not granted:', perm);
      }
      return perm === 'granted';
    } catch (err) {
      console.warn('[Notif] requestPermission error:', err);
      return false;
    }
  }

  async send(title, options = {}) {
    // Refresh cached permission state
    if (this.supported) this.permission = Notification.permission;

    if (!this.supported || this.permission !== 'granted') {
      console.log(`[Notif] Skipped (permission=${this.permission}):`, title);
      return;
    }

    const defaultOptions = {
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      tag: 'system-os-directive'
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Prefer SW showNotification — supports mobile PWA badge + better mobile support
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

    // Fallback: direct Notification API (works on desktop even without SW)
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

