import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Notification Service
 * Supports:
 * 1. Native Android Notification Center (via Capacitor LocalNotifications)
 * 2. Web / PWA Push & In-App Notifications (via ServiceWorker / Notification API)
 * 3. Exact Scheduled Alarms (Daily Challenges, Morning Habits, Evening Review)
 * 4. Real-time Sibling Trade & Barter Alerts
 */
class NotificationService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.supported = this.isNative || (typeof window !== 'undefined' && 'Notification' in window);
    this.permission = this.isNative ? 'prompt' : (this.supported ? Notification.permission : 'denied');
    this.channelCreated = false;
    this.scheduledAlarmIds = new Set();
    this._lastNotifiedTradeMap = new Map();

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
        description: 'Challenges, trade proposals, daily reminders, and streak updates for Log.',
        importance: 5, // High importance (heads-up banner + status bar icon + sound)
        visibility: 1, // Visible on lock screen
        vibration: true,
        lights: true,
        lightColor: '#FFFFFF'
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
      return false;
    }
    if (this.permission === 'granted') return true;
    if (this.permission === 'denied') {
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

  /**
   * Immediately post a notification.
   */
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

        const notifId = options.id || Math.floor(Math.random() * 2147483647);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notifId,
              title: title,
              body: options.body || '',
              channelId: 'log-notifications',
              schedule: { at: new Date(Date.now() + 50) },
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
      tag: options.tag || 'log-directive'
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

  /**
   * Schedule future alarms for challenges and daily reviews.
   */
  async scheduleFuture(id, title, body, scheduledDate) {
    if (!scheduledDate || scheduledDate.getTime() <= Date.now()) return;

    if (this.isNative) {
      try {
        const hasPerm = await this.requestPermission();
        if (!hasPerm) return;

        if (!this.channelCreated) {
          await this.initNativeChannel();
        }

        await LocalNotifications.schedule({
          notifications: [
            {
              id: id,
              title: title,
              body: body,
              channelId: 'log-notifications',
              schedule: { at: scheduledDate },
              smallIcon: 'ic_launcher'
            }
          ]
        });
        this.scheduledAlarmIds.add(id);
        console.log(`[Notif] Scheduled alarm #${id} for ${scheduledDate.toLocaleTimeString()}: ${title}`);
      } catch (e) {
        console.warn('[Notif] Failed to schedule future alarm:', e);
      }
    } else {
      // In web, use setTimeout if within active session window
      const delay = scheduledDate.getTime() - Date.now();
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          this.send(title, { body });
        }, delay);
      }
    }
  }

  /**
   * Schedule all daily routine reminders (Morning Habit, AM Challenge, PM Challenge, Evening Review).
   */
  async scheduleDailyAlarms(todayStr, challengeTimes = []) {
    if (!todayStr) return;
    const parts = todayStr.split('-').map(Number);
    const now = new Date();

    // 1. Morning Ritual Reminder (08:00 AM)
    const morningTime = new Date(parts[0], parts[1] - 1, parts[2], 8, 0, 0);
    if (morningTime > now) {
      this.scheduleFuture(101, 'Morning Ritual', "Your daily habits are due today. Let's make it count.", morningTime);
    }

    // 2. AM Challenge
    if (challengeTimes[0] && challengeTimes[0] > now) {
      this.scheduleFuture(102, 'New Challenge Available', 'A new discipline directive has been issued.', challengeTimes[0]);
    }

    // 3. PM Challenge
    if (challengeTimes[1] && challengeTimes[1] > now) {
      this.scheduleFuture(103, 'Evening Challenge Available', 'Your second daily challenge is ready to execute.', challengeTimes[1]);
    }

    // 4. Evening Accountability Review (09:30 PM)
    const eveningTime = new Date(parts[0], parts[1] - 1, parts[2], 21, 30, 0);
    if (eveningTime > now) {
      this.scheduleFuture(104, 'Evening Review', 'Take 30 seconds to review your execution and lock in your streak.', eveningTime);
    }
  }

  /**
   * Inspects trades update from Firestore and fires rich notifications when a sibling
   * proposes, counters, or accepts a trade.
   */
  checkAndNotifyTradeEvents(trades = [], currentSyncKey) {
    if (!trades || !currentSyncKey) return;

    for (const trade of trades) {
      if (!trade || !trade.id) continue;
      const lastStatus = this._lastNotifiedTradeMap.get(trade.id);
      const curStatus = trade.status;

      if (lastStatus === curStatus) continue;

      // 1. Sibling sent a trade offer to current user
      if (curStatus === 'PENDING' && trade.toUser === currentSyncKey && !lastStatus) {
        const sender = trade.fromName || 'Sibling';
        const swapText = trade.swapTaskName ? ` (Swap: ${trade.swapTaskName})` : '';
        this.send(`Trade Proposal from ${sender}`, {
          body: `Offered to trade "${trade.taskName}"${swapText}${trade.note ? `: "${trade.note}"` : ''}`,
          tag: `trade-${trade.id}`
        });
      }

      // 2. Sibling sent a counter-offer back to current user
      else if (curStatus === 'COUNTER_OFFER' && trade.fromUser === currentSyncKey && lastStatus !== 'COUNTER_OFFER') {
        const sender = trade.counterOffer?.fromName || 'Sibling';
        this.send(`Counter Proposal from ${sender}`, {
          body: `Proposed counter for "${trade.taskName}": ${trade.counterOffer?.swapTaskName || trade.counterOffer?.note || ''}`,
          tag: `trade-${trade.id}`
        });
      }

      // 3. Trade was accepted
      else if (curStatus === 'ACCEPTED' && lastStatus && lastStatus !== 'ACCEPTED') {
        if (trade.fromUser === currentSyncKey) {
          this.send('Trade Accepted! 🎉', {
            body: `Your sibling accepted the trade for "${trade.taskName}". Task has been delegated.`,
            tag: `trade-${trade.id}`
          });
        }
      }

      // 4. Trade was declined
      else if (curStatus === 'DECLINED' && lastStatus && lastStatus !== 'DECLINED') {
        if (trade.fromUser === currentSyncKey) {
          this.send('Trade Declined', {
            body: `Sibling declined the trade offer for "${trade.taskName}".`,
            tag: `trade-${trade.id}`
          });
        }
      }

      this._lastNotifiedTradeMap.set(trade.id, curStatus);
    }
  }
}

export const notifier = new NotificationService();

