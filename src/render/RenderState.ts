// Plain data snapshot consumed by renderFrame. No platform objects allowed.

import type {
  CatchCoinBurstState,
  ConsumableState,
  FishType,
  FloatingTextState,
  FtuePromptId,
  FtueStage,
  GamePhase,
  LeaderboardState,
  ParticleState,
  TutorialHintId,
  UpgradeState,
} from '../core/Types';
/** Waterline strip + scroll (bubbles live on `DiveTransitionDraw`). */
export interface DiveTransitionWaterline {
  parentY: number;
  surfaceScrollX: number;
  surfaceDrawH: number;
  surfaceDrawW: number;
  groupAlpha: number;
}

/**
 * Single snapshot for `Diving` / early `Breaching` cinematic (masked wipe + optional diver).
 * Replaces the former `oceanTransition` + `transitionBackdrop` + UI alpha fields.
 */
export interface DiveTransitionDraw {
  backdrop: { boat: number; underwater: number } | null;
  waterline: DiveTransitionWaterline | null;
  bubbles: ReadonlyArray<{ variant: number; lx: number; ly: number; alpha: number }>;
  /** Menu→game only; feet at deck anchor + fall offset. */
  diver: {
    pose: 'stand' | 'jump';
    x: number;
    y: number;
    alpha: number;
    drawW: number;
    drawH: number;
  } | null;
  /** Menu→game camera push toward the bear while UI fades. */
  camera: { x: number; y: number; zoom: number } | null;
  /** Game→menu: HUD/overlay alpha during the end-of-run prelude. */
  breachUiAlpha: number;
  /** Game→menu: slides first-person character + gun down before the waterline arrives. */
  breachPlayerExitOffset: number;
  /** Game→menu: slight camera push before fish scatter. */
  breachCameraZoom: number;
  /** Game→menu: click-to-dismiss leaderboard interstitial alpha. */
  breachLeaderboardAlpha: number;
  /** Extra full-bleed boat layer faded in over the menu during the dive intro. */
  boatOverlayAlpha: number;
  /** Boat menu chrome opacity (GO FISH, stats, …). */
  menuUiAlpha: number;
  /**
   * Menu→game: after the waterline VFX group fades, full-screen underwater overlay alpha (1→0)
   * before `Action` so the handoff matches real gameplay lighting.
   */
  oceanOverlayAlpha: number;
  breachShowBoatRevealOnly: boolean;
  breachBoatRevealAlpha: number;
}

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
  isFleeing: boolean;
  hitPoints?: number;
  maxHitPoints?: number;
}

export interface RenderState {
  phase: GamePhase;

  /** First-dive Reels-style tutorial (frozen fish until first tap) */
  ftueActive: boolean;
  ftueStage: FtueStage;
  ftuePrompt: FtuePromptId | null;

  // World
  shakeX: number;
  shakeY: number;
  player: RenderPlayerState;
  spears: RenderSpearState[];
  fish: RenderFishState[];
  ftueHandTarget: { x: number; y: number } | null;
  ftueTreasureZoom: number;
  ftueTreasureFocusBlend: number;
  particles: ParticleState[];
  floatingTexts: FloatingTextState[];
  catchCoinBursts: CatchCoinBurstState[];

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
  oxygenDamageTimer: number;
  oxygenDamageAmount: number;
  tutorialHint: {
    id: TutorialHintId;
    title: string;
    body: string;
  } | null;

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
  leaderboard: LeaderboardState;
  upgradeBackHighlight: boolean;

  // Consumable active state (action phase)
  baitActive: boolean;
  baitX: number;
  baitY: number;
  baitFraction: number;  // 1 = fresh, 0 = expired

  // Transition / scene chrome (`Diving`, early `Breaching`; null otherwise)
  diveTransition: DiveTransitionDraw | null;

  /** Brief warm flash when catch money registers (0 = off) */
  catchFlash: number;
  /** Brief red flash when a charging shark bites (0 = off) */
  sharkBiteFlash: number;
  /** Shark bite teeth overlay; `-1` = off (see `FullGameState.sharkBiteTeethElapsed`). */
  sharkBiteTeethElapsed: number;

  /** Net consumable full-screen VFX; null when idle. */
  netVfx: { elapsed: number } | null;

  /** Harpoon gun slide-in after tap-fire; `-1` = rest position below frame. */
  harpoonGunAnimElapsed: number;

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
