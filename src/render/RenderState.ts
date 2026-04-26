// Plain data snapshot consumed by renderFrame. No platform objects allowed.

import type {
  ConsumableState,
  FishType,
  FloatingTextState,
  GamePhase,
  ParticleState,
  UpgradeState,
} from '../core/Types';

export interface RenderPlayerState {
  x: number;
  y: number;
  aimAngle: number;
}

export interface RenderSpearState {
  x: number;
  y: number;
  angle: number; // radians
  carryingFishType: FishType | null;
}

export interface RenderFishState {
  x: number;
  y: number;
  type: FishType;
  /** Omitted = 1 — render-only multiplier for `drawFishSprite` */
  drawScale?: number;
  hitFlash: number;
  facingLeft: boolean;
  rotation: number;      // radians — tilt sprite to match swim direction
  isAggressive: boolean; // shark in attack mode → red warning glow
}

export interface RenderState {
  phase: GamePhase;

  /** First-dive Reels-style tutorial (frozen fish until first tap) */
  ftueActive: boolean;

  // World
  shakeX: number;
  shakeY: number;
  player: RenderPlayerState;
  spears: RenderSpearState[];
  fish: RenderFishState[];
  particles: ParticleState[];
  floatingTexts: FloatingTextState[];

  // HUD
  money: number;
  timeLeftFraction: number; // 0-1 — round timer
  roundTimeLeft: number;
  roundTimeMax: number;
  /** 1-based; advances every WAVE_DURATION_SEC in-dive. */
  waveIndex: number;
  /** 0-1, progress through the current wave (for edge meter). */
  waveProgress: number;
  timeElapsed: number;    // seconds since dive started
  /** Action only — real `sessionTime` (FTUE can keep `timeElapsed` 0; zoom easing uses this). */
  actionSessionTime: number;
  sessionEarnings: number;
  sessionCatchCount: number;
  harpoonStatus: string;
  reloadFraction: number;  // 0 = just fired, 1 = ready to shoot
  comboCount: number;
  comboActive: boolean;
  oxyBoostActive: boolean;

  // Boat phase UI
  upgradePanelOpen: keyof UpgradeState | null;
  upgrades: UpgradeState;
  upgradeCosts: Record<keyof UpgradeState, number>;
  canAfford: Record<keyof UpgradeState, boolean>;
  consumables: ConsumableState;
  canAffordConsumables: { net: boolean; bait: boolean };
  lastRunEarnings: number;
  lastRunDurationSec: number;
  lastRunCatchCount: number;

  // Consumable active state (action phase)
  baitActive: boolean;
  baitX: number;
  baitY: number;
  baitFraction: number;  // 1 = fresh, 0 = expired

  // Transition
  diveAlpha: number; // 0 = boat fully visible, 1 = fully underwater

  /** Brief warm flash when catch money registers (0 = off) */
  catchFlash: number;

  /** Center-screen chest open payout (Ridiculous Hook style); undefined when idle */
  treasureCinematic?: {
    progress: number;
    /** 0-1: full-screen white before prize / chest (Ridiculous Fishing beat) */
    revealWhiteAlpha: number;
    opened: boolean;
    chestScale: number;
    shake: number;
    prizeText: string;
    /** After gold hits the chest, show combo on the same card */
    comboText?: string;
  };
}
