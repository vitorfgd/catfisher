// Browser-only audio adapter. Generates simple tones via Web Audio API.
// Swap this for MHS SoundComponent mapping during the MHS port.

import type { GameEvent } from '../core/Types';
import { FishType } from '../core/Types';
import type { AudioAdapter } from './GameEvents';

/** Peak linear gain after fade-in (`playDiverEntryPercussion`). */
const SPLASH_TARGET_GAIN = 0.35;
/** Quick fade-in on splash sample (seconds). */
const SPLASH_FADE_IN_SEC = 0.085;

/** Voices for harpoon OG so rapid fire / first decode don’t steal one element. */
const HARPOON_VOICE_COUNT = 4;
/** Slightly below full-scale (OGG can be hot). */
const HARPOON_FIRE_VOLUME = 0.82;

export class BrowserAudioAdapter implements AudioAdapter {
  private ctx: AudioContext | null = null;
  private readonly backgroundMusic: HTMLAudioElement | null;
  private readonly harpoonVoices: HTMLAudioElement[] = [];
  private harpoonVoiceIndex = 0;
  private readonly diverEntryPercSrc: string | null = null;
  private readonly waterlineBubblesSrc: string | null = null;
  private readonly boatMenuLoop: HTMLAudioElement | null = null;
  private readonly underwaterLoop: HTMLAudioElement | null = null;
  private boatMenuAmbientWanted = false;
  private underwaterAmbientWanted = false;
  private backgroundMusicStarted = false;

  constructor(
    backgroundMusicSrc?: string,
    harpoonFireSrc?: string,
    boatMenuLoopSrc?: string,
    diverEntryPercSrc?: string,
    waterlineBubblesSrc?: string,
    underwaterLoopSrc?: string,
  ) {
    this.backgroundMusic = backgroundMusicSrc != null ? new Audio(backgroundMusicSrc) : null;
    if (this.backgroundMusic != null) {
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = 0.12;
      this.backgroundMusic.preload = 'auto';
    }
    if (harpoonFireSrc != null && harpoonFireSrc !== '') {
      for (let i = 0; i < HARPOON_VOICE_COUNT; i += 1) {
        const el = new Audio(harpoonFireSrc);
        el.preload = 'auto';
        el.volume = HARPOON_FIRE_VOLUME;
        void el.load();
        this.harpoonVoices.push(el);
      }
    }
    if (boatMenuLoopSrc != null && boatMenuLoopSrc !== '') {
      const loop = new Audio(boatMenuLoopSrc);
      loop.loop = true;
      loop.volume = 0.09;
      loop.preload = 'auto';
      this.boatMenuLoop = loop;
    }
    if (diverEntryPercSrc != null && diverEntryPercSrc !== '') {
      this.diverEntryPercSrc = diverEntryPercSrc;
      const preload = new Audio(diverEntryPercSrc);
      preload.preload = 'auto';
      void preload.load();
    }
    if (waterlineBubblesSrc != null && waterlineBubblesSrc !== '') {
      this.waterlineBubblesSrc = waterlineBubblesSrc;
      const preload = new Audio(waterlineBubblesSrc);
      preload.preload = 'auto';
      void preload.load();
    }
    if (underwaterLoopSrc != null && underwaterLoopSrc !== '') {
      const loop = new Audio(underwaterLoopSrc);
      loop.loop = true;
      loop.volume = 0.1;
      loop.preload = 'auto';
      this.underwaterLoop = loop;
    }

    const onFirstGesture = (): void => this.unlockAmbientAudio();
    window.addEventListener('pointerdown', onFirstGesture, { once: true, passive: true });
    window.addEventListener('keydown', onFirstGesture, { once: true });
  }

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  private startBackgroundMusic(): void {
    if (this.backgroundMusic == null || this.backgroundMusicStarted) return;
    this.backgroundMusicStarted = true;
    void this.backgroundMusic.play().catch(() => {
      // Browsers can block playback until a user gesture; retry on the next event.
      this.backgroundMusicStarted = false;
    });
  }

  /** After first user gesture: BGM plus boat menu loop if that screen is active. */
  private unlockAmbientAudio(): void {
    this.startBackgroundMusic();
    if (this.boatMenuAmbientWanted && this.boatMenuLoop != null) {
      void this.boatMenuLoop.play().catch(() => {});
    }
    if (this.underwaterAmbientWanted && this.underwaterLoop != null) {
      void this.underwaterLoop.play().catch(() => {});
    }
  }

  syncBoatMenuAmbient(active: boolean): void {
    this.boatMenuAmbientWanted = active;
    if (this.boatMenuLoop == null) return;
    if (active) {
      if (this.boatMenuLoop.paused) {
        void this.boatMenuLoop.play().catch(() => {});
      }
    } else {
      this.boatMenuLoop.pause();
      this.boatMenuLoop.currentTime = 0;
    }
  }

  syncUnderwaterAmbient(active: boolean): void {
    this.underwaterAmbientWanted = active;
    if (this.underwaterLoop == null) return;
    if (active) {
      if (this.underwaterLoop.paused) {
        void this.underwaterLoop.play().catch(() => {});
      }
    } else {
      this.underwaterLoop.pause();
      this.underwaterLoop.currentTime = 0;
    }
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

  private playDiverEntryPercussion(): void {
    if (this.diverEntryPercSrc == null) return;
    try {
      const ctx = this.getCtx();
      void ctx.resume();

      const clip = new Audio(this.diverEntryPercSrc);
      clip.volume = 1;

      const source = ctx.createMediaElementSource(clip);
      const gainNode = ctx.createGain();
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      const t0 = ctx.currentTime;
      gainNode.gain.setValueAtTime(0, t0);
      gainNode.gain.linearRampToValueAtTime(SPLASH_TARGET_GAIN, t0 + SPLASH_FADE_IN_SEC);

      const cleanup = (): void => {
        source.disconnect();
        gainNode.disconnect();
      };
      clip.addEventListener('ended', cleanup, { once: true });

      void clip.play().catch(() => {
        cleanup();
      });
    } catch {
      try {
        const clip = new Audio(this.diverEntryPercSrc);
        clip.volume = SPLASH_TARGET_GAIN;
        void clip.play().catch(() => {});
      } catch {
        // Ignore decode / playback failures.
      }
    }
  }

  private playWaterlineBubbleChurn(): void {
    if (this.waterlineBubblesSrc == null) return;
    try {
      const clip = new Audio(this.waterlineBubblesSrc);
      clip.volume = 0.8;
      void clip.play().catch(() => {});
    } catch {
      // Ignore decode / playback failures.
    }
  }

  private playHarpoonFire(): void {
    void this.getCtx().resume();
    if (this.harpoonVoices.length === 0) {
      this.playTone(165, 0.08, 0.1, 'square');
      return;
    }
    try {
      const clip = this.harpoonVoices[this.harpoonVoiceIndex];
      this.harpoonVoiceIndex = (this.harpoonVoiceIndex + 1) % this.harpoonVoices.length;
      clip.volume = HARPOON_FIRE_VOLUME;
      clip.currentTime = 0;
      void clip.play().catch(() => {
        this.playTone(165, 0.08, 0.1, 'square');
      });
    } catch {
      this.playTone(165, 0.08, 0.1, 'square');
    }
  }

  handleEvent(event: GameEvent): void {
    this.unlockAmbientAudio();
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
        if (event.fishType === FishType.Treasure) {
          const n = Math.min(10, Math.max(4, 3 + Math.floor(Math.log2(event.value + 8))));
          const base = 720;
          for (let i = 0; i < n; i += 1) {
            const delay = i * 42;
            const freq = base + i * 55 + Math.min(120, event.value / 25);
            setTimeout(() => this.playTone(freq, 0.055, 0.14, 'sine'), delay);
          }
          break;
        }
        const freq = 420 + Math.min(event.value * 4, 360);
        this.playTone(freq, 0.12, 0.22, 'triangle');
        setTimeout(() => this.playTone(freq + 110, 0.1, 0.18, 'triangle'), 70);
        break;
      }
      case 'spearFired':
        this.playHarpoonFire();
        break;
      case 'diveStarted':
        this.playTone(220, 0.35, 0.15, 'sine');
        break;
      case 'diverSplash':
        this.playDiverEntryPercussion();
        break;
      case 'diverJumped':
        this.playTone(520, 0.055, 0.12, 'triangle');
        setTimeout(() => this.playTone(780, 0.085, 0.14, 'triangle'), 45);
        break;
      case 'transitionWaterlineBubbles':
        this.playWaterlineBubbleChurn();
        break;
      case 'runEnded':
        this.playTone(520, 0.14, 0.18, 'triangle');
        setTimeout(() => this.playTone(400, 0.18, 0.16, 'triangle'), 160);
        break;
      case 'upgradeBought':
        this.playTone(680, 0.14, 0.18, 'triangle');
        break;
      case 'ftueDiveExited':
      case 'ftueOxygenLessonShown':
      case 'tutorialHintShown':
        break;
    }
  }
}
