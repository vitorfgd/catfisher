// Browser-only audio adapter. Generates simple tones via Web Audio API.
// Swap this for MHS SoundComponent mapping during the MHS port.

import type { GameEvent } from '../core/Types';
import { FishType } from '../core/Types';
import type { AudioAdapter } from './GameEvents';

export class BrowserAudioAdapter implements AudioAdapter {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    gain = 0.18,
    type: OscillatorType = 'sine',
  ): void {
    try {
      const ctx = this.getCtx();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // Audio may be unavailable before the first interaction.
    }
  }

  handleEvent(event: GameEvent): void {
    switch (event.type) {
      case 'fishHooked': {
        const freq = event.fishType === FishType.Rare
          ? 420
          : event.fishType === FishType.Boss
            ? 200
            : 280;
        this.playTone(freq, 0.09, 0.16, 'sawtooth');
        break;
      }
      case 'fishCaught': {
        const freq = 420 + Math.min(event.value * 4, 360);
        this.playTone(freq, 0.12, 0.22, 'triangle');
        setTimeout(() => this.playTone(freq + 110, 0.1, 0.18, 'triangle'), 70);
        break;
      }
      case 'spearFired':
        this.playTone(165, 0.08, 0.1, 'square');
        break;
      case 'diveStarted':
        this.playTone(220, 0.35, 0.15, 'sine');
        break;
      case 'runEnded':
        this.playTone(520, 0.14, 0.18, 'triangle');
        setTimeout(() => this.playTone(400, 0.18, 0.16, 'triangle'), 160);
        break;
      case 'upgradeBought':
        this.playTone(680, 0.14, 0.18, 'triangle');
        break;
    }
  }
}
