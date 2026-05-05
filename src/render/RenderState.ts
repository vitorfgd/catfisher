// Plain data snapshot consumed by renderFrame. No platform objects allowed.

import type {
  ConsumableState,
  FishType,
  FloatingTextState,
  GamePhase,
  ParticleState,
  UpgradeState,
} from '../core/Types';
import type { OceanTransitionDraw } from './oceanTransition';

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
  carryingFishScale: number;
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
  attackProgress: number; // Large shark charge visual, 0-1
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
  /** During treasure count-up, interpolated dollars for the HUD pill. */
  hudMoneyDisplay: number;
  timeLeftFraction: number; // 0-1 — round timer
  roundTimeLeft: number;
  roundTimeMax: number;
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

  // Transition / scene chrome
  /** Populated while `Diving` or `Breaching`; otherwise null. */
  oceanTransition: OceanTransitionDraw | null;

  /**
   * Full-screen `boat-bg` / `underwater-bg` alphas under the ocean VFX (and under in-game world during breach).
   * Null during breach boat-reveal tail (see `breachBoatRevealAlpha`).
   */
  transitionBackdrop: { boat: number; underwater: number } | null;
  /** True once breach ocean move has finished (`breachTimer` ≥ fade + move). */
  breachShowBoatRevealOnly: boolean;
  /** Breach end: 0 = start of boat reveal; 1 = full `drawBoatScreen` before phase flip. */
  breachBoatRevealAlpha: number;

  /** Brief warm flash when catch money registers (0 = off) */
  catchFlash: number;
  /** Brief red flash when a charging shark bites (0 = off) */
  sharkBiteFlash: number;
  /** Shark bite teeth overlay; `-1` = off (see `FullGameState.sharkBiteTeethElapsed`). */
  sharkBiteTeethElapsed: number;

  /** Net consumable full-screen VFX; null when idle. */
  netVfx: { elapsed: number } | null;

  /** Pulse timer after using net/bait on the dive HUD (seconds). */
  hudConsumableFlash: { net: number; bait: number };

  /** In-world chest payout overlay; undefined when idle */
  treasureCinematic?: {
    progress: number;
    /** 0-1: brief white punch */
    revealWhiteAlpha: number;
    opened: boolean;
    chestScreenX: number;
    chestScreenY: number;
    chestScale: number;
    shake: number;
    prizeText: string;
    /** After gold hits the chest, show combo on the same card */
    comboText?: string;
    treasureValue: number;
    elapsedSinceAward: number;
    coinCount: number;
  };
}
