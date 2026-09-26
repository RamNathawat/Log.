/**
 * Procedural Audio Service (Web Audio API)
 * Extremely subtle, calm, zen sound effects for meaningful events.
 * Can be muted globally.
 */
class AudioService {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  initContext() {
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  playTone(freq, type, duration, vol, slideFreq = null) {
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    
    // Very soft volume
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.frequency.setValueAtTime(freq, now);
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideFreq, now + duration);
    }

    osc.start(now);
    osc.stop(now + duration);
  }

  // Meaningful Events
  playAccept() {
    // Subtle low drone
    this.playTone(150, 'sine', 0.4, 0.05);
  }

  playComplete() {
    // Satisfying harmonic chime
    this.playTone(440, 'sine', 0.1, 0.03);
    setTimeout(() => this.playTone(554.37, 'sine', 0.4, 0.03), 100);
  }

  playFail() {
    // Soft low thud
    this.playTone(100, 'triangle', 0.3, 0.06, 50);
  }

  playUnlock() {
    // Special resonant chime for recreation
    this.playTone(523.25, 'sine', 0.6, 0.04);
    setTimeout(() => this.playTone(659.25, 'sine', 0.6, 0.04), 150);
    setTimeout(() => this.playTone(783.99, 'sine', 1.2, 0.04), 300);
  }

  playDirectiveAlert() {
    // Gentle alert for new demo mode directive
    this.playTone(880, 'sine', 0.1, 0.03);
    setTimeout(() => this.playTone(880, 'sine', 0.3, 0.03), 200);
  }
}

export const audio = new AudioService();
