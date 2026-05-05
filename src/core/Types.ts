// @GUARD: Core type definitions. Prefer additive changes; renames are OK when gameplay shifts.

export enum GamePhase {
  Boat = 'Boat',
  Diving = 'Diving',
  Action = 'Action',
}

export enum FishType {
  Small  = 0,
  Medium = 1,
  Large  = 2,
  /** High-value swordfish — uses rare spawn slot */
  Rare   = 3,
  Jelly  = 4,   // jellyfish — drifts vertically, moderate value
  Puffer   = 5,   // pufferfish — adds time to the round when caught
  Treasure = 6,   // treasure chest — periodic spawn; very high value; opening cinematic on spear haul-in
  /** Armored "rock" boss: huge hitbox, multi-hit, red screen presence */
  Boss     = 7,
  /** Steampunk / “metal plate” clownfish */
  Clown    = 8,
}

export enum SpearMode {
  Outbound = 'Outbound',
  Returning = 'Returning',
}

export interface UpgradeState {
  speargun: number; // 1-4  — range + power + reload + reel speed
  haul:     number; // 1-4  — earnings multiplier (incl. treasure)
  oxygen:   number; // 1-4  — max dive time
}

export interface ConsumableState {
  net: number;   // units in stock
  bait: number;  // units in stock
}

export interface PlayerState {
  x: number;
  y: number;
  aimAngle: number; // radians; 0 = right, -PI/2 = up
  shootCooldown: number; // seconds remaining until next shot
}

export interface SpearState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fireAngle: number;        // locked at fire time — used for rendering always
  distanceTravelled: number;
  maxDistance: number;
  mode: SpearMode;
  caughtFishType: FishType | null;
  /** Distance from player anchor when fish was hooked; used for progressive reel-in scale. */
  caughtFishStartDistance: number;
  catchValue: number;
  done: boolean;
}

export interface FishState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;           // vertical velocity
  wanderTimer: number;  // seconds until next random direction change
  age: number;          // seconds this fish has been alive — used for shark aggro
  hasAttacked: boolean; // shark can only bite once
  type: FishType;
  alive: boolean;
  hitFlash: number;
  /** Visual + hitbox scale; omitted = 1. Used for FTUE showcase fish. */
  drawScale?: number;
  /** The three first-dive tutorial fish — when one is caught, the rest panic-flee. */
  ftueShowcase?: boolean;
  /** Sustained escape from player; handled in `updateFish` (bypasses wander + speed cap). */
  ftueFleeing?: boolean;
  /** Boss only — damage remaining; normal fish use one-hit default */
  hitPoints?: number;
}

export interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
  /** If true, draw as a motion-streak (spark) instead of a round blob */
  streak?: boolean;
  /** 1 = default air drag on horizontal motion */
  drag?: number;
  /** Scales burst vs drift (lower = more floaty) */
  gravity?: number;
}

export interface FloatingTextState {
  x: number;
  y: number;
  vy: number;
  text: string;
  life: number;
  maxLife: number;
  /** >1 = burst pop, eases to 1 in simulation */
  textScale?: number;
  /** Drives color / punch in the renderer */
  tier?: 'normal' | 'good' | 'jackpot';
}

export type GameEvent =
  | { type: 'fishHooked'; x: number; y: number; fishType: FishType }
  | { type: 'fishCaught'; x: number; y: number; value: number; fishType: FishType }
  | { type: 'spearFired' }
  | { type: 'diveStarted' }
  | { type: 'runEnded'; earnings: number; runDurationSec: number }
  | { type: 'upgradeBought'; id: string }
  | { type: 'ftueDiveExited' };

export interface FullGameState {
  phase: GamePhase;
  money: number;
  upgrades: UpgradeState;
  consumables: ConsumableState;

  // Action phase
  player: PlayerState;
  spears: SpearState[];
  fish: FishState[];
  particles: ParticleState[];
  floatingTexts: FloatingTextState[];
  /** Counts down; lose the run at 0. `maxOxygen` upgrade sets roundTimeMax. */
  roundTimeLeft: number;
  roundTimeMax: number;
  sessionEarnings: number;
  sessionCatchCount: number;
  comboCount: number;
  comboTimer: number;
  oxyBoostTimer: number;       // > 0 while puffer-catch celebration is showing
  upgradePanelOpen: keyof UpgradeState | null;  // which upgrade detail panel is open
  treasureSpawnTimer: number;  // countdown to next treasure fish spawn
  /** Rock boss spawn — separate from random fish table */
  bossSpawnTimer: number;
  lastRunEarnings: number;
  lastRunDurationSec: number;
  lastRunCatchCount: number;

  sessionTime: number;   // seconds elapsed since dive started
  nextFishId: number;
  nextSpearId: number;
  fishSpawnTimer: number;
  /**
   * Last `floor(sessionTime / WAVE_DURATION_SEC)` for which we fired the wave cluster spawn.
   * -1 = none yet. Each new wave spawns a burst; continuous spawn tapers to the end of the block.
   */
  lastWaveBurstIndex: number;

  // Consumable active state (action phase)
  baitActive: boolean;
  baitTimer: number;
  baitX: number;
  baitY: number;

  // Juice
  shakeIntensity: number;
  shakeX: number;
  shakeY: number;
  /** Brief full-screen flash when a catch is cashed in (seconds of alpha driver) */
  catchFlash: number;
  /** Brief red flash when an attacking shark bites. */
  sharkBiteFlash: number;

  /** HUD consumable button pulse after use (seconds remaining). */
  hudConsumableFlash: { net: number; bait: number };

  // Transition
  diveTimer: number; // 0 -> DIVE_DURATION during Diving phase

  // Event queue (drained each frame by platform layer)
  pendingEvents: GameEvent[];

  /**
   * First-visit: start underwater with frozen fish; first tap unfreezes + starts the real run
   * (Reels-style hook; stored completion is in platform, not here).
   */
  ftueActive: boolean;

  /** Shown over Action when a spear-caught treasure is paying out (Ridiculous Hook–style). */
  treasureReveal: TreasureRevealState | null;
}

/** Spear-delivery only; money applies when the chest opens, not on hook. */
export interface TreasureRevealState {
  elapsed: number;
  opened: boolean;
  awarded: boolean;
  value: number; // final dollars including combo; applied once at award time
  /** Where the hit FX should originate */
  x: number;
  y: number;
  /** Combo line already baked into `value` — for COMBO text at award */
  comboBonus: number;
  totalComboForLine: number;
  durationSec: number;
  awardAtSec: number;
  /** Set when award applies — HUD count-up from → to (inclusive of payout). */
  moneyLerpFrom?: number;
  moneyLerpTo?: number;
}
