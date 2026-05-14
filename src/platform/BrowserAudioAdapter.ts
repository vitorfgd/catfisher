// Browser-only audio adapter. Generates simple tones via Web Audio API.
// Swap this for MHS SoundComponent mapping during the MHS port.

import type { GameEvent } from '../core/Types';
import { FishType } from '../core/Types';
import type { AudioAdapter } from './GameEvents';

/** Browser media element volume for the preloaded diver splash sample. */
const SPLASH_TARGET_GAIN = 0.35;

const BGM_VOLUME = 0.12;
const BGM_FADE_OUT_SEC = 1.35;
const UNDERWATER_AMBIENT_VOLUME = 0.1;
const UNDERWATER_AMBIENT_FADE_OUT_SEC = 1.2;
const HARPOON_SHOT_VOLUME = 0.5;

export class BrowserAudioAdapter implements AudioAdapter {
  private ctx: AudioContext | null = null;
  private readonly backgroundMusic: HTMLAudioElement | null;
  private musicMuted = false;
  private readonly diverEntryPercussion: HTMLAudioElement | null = null;
  private readonly waterlineBubbles: HTMLAudioElement | null = null;
  private readonly boatMenuLoop: HTMLAudioElement | null = null;
  private readonly underwaterLoop: HTMLAudioElement | null = null;
  private readonly harpoonShot: HTMLAudioElement | null = null;
  private boatMenuAmbientWanted = false;
  private underwaterAmbientWanted = false;
  private backgroundMusicStarted = false;
  private backgroundMusicWanted = false;
  private backgroundMusicFadeFrame: number | null = null;
  private underwaterAmbientFadeFrame: number | null = null;

  constructor(
    backgroundMusicSrc?: string,
    boatMenuLoopSrc?: string,
    diverEntryPercSrc?: string,
    waterlineBubblesSrc?: string,
    underwaterLoopSrc?: string,
    harpoonShotSrc?: string,
  ) {
    this.backgroundMusic = backgroundMusicSrc != null ? new Audio(backgroundMusicSrc) : null;
    if (this.backgroundMusic != null) {
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = BGM_VOLUME;
      this.backgroundMusic.preload = 'auto';
    }
    if (boatMenuLoopSrc != null && boatMenuLoopSrc !== '') {
      const loop = new Audio(boatMenuLoopSrc);
      loop.loop = true;
      loop.volume = 0.1;
      loop.preload = 'auto';
      this.boatMenuLoop = loop;
    }
    if (diverEntryPercSrc != null && diverEntryPercSrc !== '') {
      const clip = new Audio(diverEntryPercSrc);
      clip.volume = SPLASH_TARGET_GAIN;
      clip.preload = 'auto';
      clip.load();
      this.diverEntryPercussion = clip;
    }
    if (waterlineBubblesSrc != null && waterlineBubblesSrc !== '') {
      const clip = new Audio(waterlineBubblesSrc);
      clip.volume = 0.8;
      clip.preload = 'auto';
      clip.load();
      this.waterlineBubbles = clip;
    }
    if (underwaterLoopSrc != null && underwaterLoopSrc !== '') {
      const loop = new Audio(underwaterLoopSrc);
      loop.loop = true;
      loop.volume = UNDERWATER_AMBIENT_VOLUME;
      loop.preload = 'auto';
      this.underwaterLoop = loop;
    }
    if (harpoonShotSrc != null && harpoonShotSrc !== '') {
      const clip = new Audio(harpoonShotSrc);
      clip.volume = HARPOON_SHOT_VOLUME;
      clip.preload = 'auto';
      clip.load();
      this.harpoonShot = clip;
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
    if (this.backgroundMusic == null) return;
    this.cancelBackgroundMusicFade();
    if (this.backgroundMusicStarted && !this.backgroundMusic.paused) {
      this.backgroundMusic.volume = this.musicMuted ? 0 : BGM_VOLUME;
      return;
    }
    this.backgroundMusicStarted = true;
    this.backgroundMusic.currentTime = 0;
    this.backgroundMusic.volume = this.musicMuted ? 0 : BGM_VOLUME;
    void this.backgroundMusic.play().catch(() => {
      // Browsers can block playback until a user gesture; retry on the next event.
      this.backgroundMusicStarted = false;
    });
  }

  private cancelBackgroundMusicFade(): void {
    if (this.backgroundMusicFadeFrame == null) return;
    cancelAnimationFrame(this.backgroundMusicFadeFrame);
    this.backgroundMusicFadeFrame = null;
  }

  private fadeOutBackgroundMusic(): void {
    if (this.backgroundMusic == null || !this.backgroundMusicStarted || this.backgroundMusic.paused) return;
    if (this.backgroundMusicFadeFrame != null) return;

    const startedAt = performance.now();
    const startVolume = this.backgroundMusic.volume;
    const durationMs = BGM_FADE_OUT_SEC * 1000;

    const step = (now: number): void => {
      if (this.backgroundMusic == null || this.backgroundMusicWanted) {
        this.backgroundMusicFadeFrame = null;
        return;
      }

      const progress = Math.min(1, (now - startedAt) / durationMs);
      this.backgroundMusic.volume = startVolume * (1 - progress);

      if (progress >= 1) {
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;
        this.backgroundMusicStarted = false;
        this.backgroundMusicFadeFrame = null;
        return;
      }

      this.backgroundMusicFadeFrame = requestAnimationFrame(step);
    };

    this.backgroundMusicFadeFrame = requestAnimationFrame(step);
  }

  private cancelUnderwaterAmbientFade(): void {
    if (this.underwaterAmbientFadeFrame == null) return;
    cancelAnimationFrame(this.underwaterAmbientFadeFrame);
    this.underwaterAmbientFadeFrame = null;
  }

  private fadeOutUnderwaterAmbient(): void {
    if (this.underwaterLoop == null || this.underwaterLoop.paused) return;
    if (this.underwaterAmbientFadeFrame != null) return;

    const startedAt = performance.now();
    const startVolume = this.underwaterLoop.volume;
    const durationMs = UNDERWATER_AMBIENT_FADE_OUT_SEC * 1000;

    const step = (now: number): void => {
      if (this.underwaterLoop == null || this.underwaterAmbientWanted) {
        this.underwaterAmbientFadeFrame = null;
        return;
      }

      const progress = Math.min(1, (now - startedAt) / durationMs);
      this.underwaterLoop.volume = startVolume * (1 - progress);

      if (progress >= 1) {
        this.underwaterLoop.pause();
        this.underwaterLoop.currentTime = 0;
        this.underwaterAmbientFadeFrame = null;
        return;
      }

      this.underwaterAmbientFadeFrame = requestAnimationFrame(step);
    };

    this.underwaterAmbientFadeFrame = requestAnimationFrame(step);
  }

  /** After first user gesture: loop ambient beds for the currently active screen. */
  private unlockAmbientAudio(): void {
    if (this.boatMenuAmbientWanted && this.boatMenuLoop != null) {
      void this.boatMenuLoop.play().catch(() => {});
    }
    if (this.underwaterAmbientWanted && this.underwaterLoop != null) {
      void this.underwaterLoop.play().catch(() => {});
    }
  }

  syncBackgroundMusic(active: boolean): void {
    this.backgroundMusicWanted = active;
    if (active) {
      this.startBackgroundMusic();
    } else {
      this.fadeOutBackgroundMusic();
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
      this.cancelUnderwaterAmbientFade();
      this.underwaterLoop.volume = UNDERWATER_AMBIENT_VOLUME;
      if (this.underwaterLoop.paused) {
        void this.underwaterLoop.play().catch(() => {});
      }
    } else {
      this.fadeOutUnderwaterAmbient();
    }
  }

  syncMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    if (this.backgroundMusic != null && this.backgroundMusicWanted && this.backgroundMusicFadeFrame == null) {
      this.backgroundMusic.volume = muted ? 0 : BGM_VOLUME;
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
    if (this.diverEntryPercussion == null) return;
    try {
      this.diverEntryPercussion.pause();
      this.diverEntryPercussion.currentTime = 0;
      this.diverEntryPercussion.volume = SPLASH_TARGET_GAIN;
      void this.diverEntryPercussion.play().catch(() => {});
    } catch {
      // Ignore decode / playback failures.
    }
  }

  private playWaterlineBubbleChurn(): void {
    if (this.waterlineBubbles == null) return;
    try {
      this.waterlineBubbles.pause();
      this.waterlineBubbles.currentTime = 0;
      this.waterlineBubbles.volume = 0.8;
      void this.waterlineBubbles.play().catch(() => {});
    } catch {
      // Ignore decode / playback failures.
    }
  }

  private playHarpoonShot(): void {
    if (this.harpoonShot == null) return;
    try {
      this.harpoonShot.pause();
      this.harpoonShot.currentTime = 0;
      this.harpoonShot.volume = HARPOON_SHOT_VOLUME;
      void this.harpoonShot.play().catch(() => {});
    } catch {
      // Ignore decode / playback failures.
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
        this.playHarpoonShot();
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
