import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Haptics Service
 * Provides tactile physical feedback on native mobile (and Web Vibration API fallback).
 */
class HapticsService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  async impactLight() {
    if (this.isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {}
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(15); } catch (e) {}
    }
  }

  async impactMedium() {
    if (this.isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (e) {}
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(35); } catch (e) {}
    }
  }

  async impactHeavy() {
    if (this.isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (e) {}
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(70); } catch (e) {}
    }
  }

  async notificationSuccess() {
    if (this.isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch (e) {}
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([40, 60, 80]); } catch (e) {}
    }
  }

  async notificationWarning() {
    if (this.isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Warning });
      } catch (e) {}
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([80, 50, 80]); } catch (e) {}
    }
  }
}

export const haptics = new HapticsService();
