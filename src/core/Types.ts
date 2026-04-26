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
  Rare   = 3,
  Jelly  = 4,   // jellyfish — drifts vertically, moderate value
  Puffer   = 5,   // pufferfish — adds time to the round when caught
  Treasure = 6,   // treasure chest — unlocked by Haul lvl 3+, very high value
  /** Armored "rock" boss: huge hitbox, multi-hit, red screen presence */
  Boss     = 7,
}

export enum SpearMode {
  Outbound = 'Outbound',
  Returning = 'Returning',
}

export interface UpgradeState {
  speargun: number; // 1-4  — range + power + reload + reel speed
  haul:     number; // 1-4  — earnings multiplier; lvl 3+ unlocks treasure fish
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
  | { type: 'upgradeBought'; id: string };

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

  // Transition
  diveTimer: number; // 0 -> DIVE_DURATION during Diving phase

  // Event queue (drained each frame by platform layer)
  pendingEvents: GameEvent[];
}
