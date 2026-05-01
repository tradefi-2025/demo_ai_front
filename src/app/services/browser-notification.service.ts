import { Injectable } from '@angular/core';
import { Signal } from '../models/reponse/signal-response';

@Injectable({
  providedIn: 'root'
})
export class BrowserNotificationService {
  get isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  get permission(): NotificationPermission {
    if (!this.isSupported) {
      return 'denied';
    }

    return Notification.permission;
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    return Notification.requestPermission();
  }

  notifySignal(signal: Signal): void {
    if (!this.isSupported || this.permission !== 'granted') {
      return;
    }

    if (document.visibilityState === 'visible' && document.hasFocus()) {
      return;
    }

    const label = signal.signal?.trim() || signal.estimatedAction?.trim() || 'New signal';
    const confidence = signal.probability !== null ? ` ${Math.round(signal.probability * 100)}%` : '';

    new Notification(signal.agentName, {
      body: `${label}${confidence}`,
      tag: `signal-${signal.signalId}`,
    });
  }
}
