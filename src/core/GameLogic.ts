// @GUARD: Core game state machine. No DOM, canvas, MHS, or audio calls.
// All platform side-effects are triggered via pendingEvents (drained by BrowserGameLoop).

import {
  FishType,
  GamePhase,
  type ConsumableState,
  type FullGameState,
  type LeaderboardEntry,
  type TutorialHintId,
  type TutorialSeenState,
  type UpgradeState,
} from './Types';
export type { GameEvent } from './Types';

import type { GameInputCommand } from '../shared/InputCommands';
import { LEADERBOARD_PLACEHOLDER_NPCS } from '../shared/leaderboardPlaceholders';
import type { RenderState } from '../render/RenderState';

import {
  buildDiveTransitionDraw,
  isBreachingAwaitingConfirm,
  playGameToMenuTransition,
  playMenuToGameTransition,
  updateDiveTransition,
} from './diveTransitionController';
import { getGameRng } from './GameRng';
import type { Rng } from './Rng';
import { actionWorldToCanvas, canvasToActionWorld, getActionViewZoomForSession } from './ActionViewTransform';
import {
  BAIT_COST,
  BAIT_DURATION,
  BAIT_MAX_STOCK,
  BAIT_NUDGE_IMPULSE,
  BAIT_NUDGE_NEAR_PX,
  BAIT_SCHOOL_FISH_COUNT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  getInGameMusicButtonRect,
  OCEAN_BREACH_TOTAL_SEC,
  TREASURE_REVEAL_AWARD_AT_SEC,
  TREASURE_REVEAL_DURATION_SEC,
  TREASURE_MONEY_LERP_SEC,
  TREASURE_REVEAL_WHITE_FADE_SEC,
  TREASURE_REVEAL_WHITE_PEAK_SEC,
  NET_COST,
  NET_MAX_STOCK,
  NET_VFX_CATCH_AT_SEC,
  NET_VFX_TOTAL_SEC,
  HARPOON_GUN_ANIM_TOTAL_SEC,
  OXYGEN_DRAIN_RATE,
  PLAYER_X,
  PLAYER_Y,
  PUFFER_TIME_BONUS,
  REELED_FISH_SCALE_END,
  REELED_FISH_SCALE_START,
  WAVE_BURST_BASE_COUNT,
  WAVE_BURST_EXTRA_PER_WAVE,
  WAVE_BURST_MAX_COUNT,
  WAVE_BURST_EXTRA_CAP,
  WAVE_DURATION_SEC,
  WAVE_NEAR_SPAWN_FRACTION,
  FISH_SPAWN_MAX_ALIVE,
  FISH_DENSITY_SPEARGUN_LEVELS_PER_EXTRA,
  FISH_SPAWN_WAVE_INTERVAL_SCALE_PER_WAVE,
  FISH_SPAWN_WAVE_INTERVAL_SCALE_CAP,
  SHAKE_COMBO_SCALE,
  SHAKE_DECAY,
  SHAKE_ON_CATCH,
  SHAKE_ON_HOOK,
  SHARK_AGGRO_DELAY,
  SHARK_ATTACK_CHARGE_SPEED,
  SHARK_ATTACK_DAMAGE,
  SHARK_ATTACK_GROW_SEC,
  SHARK_ATTACK_RANGE,
  SHARK_ATTACK_STAGE_MARGIN_X,
  SHARK_ATTACK_STAGE_MAX_Y_FRAC,
  SHARK_ATTACK_STAGE_MIN_Y_FRAC,
  SHARK_ATTACK_STAGE_SPEED,
  SHARK_BITE_FLASH_DECAY,
  SHARK_BITE_VFX_TOTAL_SEC,
  SHARK_FLEE_SPEED,
  SHARK_HIT_FLEE_SEC,
  SHARK_MAX_ALIVE,
  SHARK_REATTACK_WAIT_MAX_SEC,
  SHARK_REATTACK_WAIT_MIN_SEC,
  OXYGEN_DAMAGE_VFX_SEC,
  TREASURE_SPAWN_INTERVAL,
  UPGRADE_MAX_LEVEL,
  BOSS_SPAWN_INTERVAL,
  BOSS_SPAWN_MIN_TIME,
  BOSS_NET_DAMAGE,
  BOSS_SPAWN_FIRST_DELAY,
  BOSS_FISH_MAX_HP,
  BOSS_MIN_SPEAR_LEVEL_TO_DAMAGE,
  getBossSpearDamage,
  CATCH_FLASH_CAP,
  CATCH_FLASH_DECAY,
  getFtueSharkPulseScaleFactor,
} from './Constants';
import {
  getAllUpgradeCosts,
  getCanAffordAll,
  getHaulMultiplier,
  getMaxOxygen,
  getReelSpeed,
  getShootCooldown,
  getSpearMaxDistance,
  getUpgradeCost,
  getValueMultiplier,
} from './UpgradeSystem';
import {
  getFishValue,
  getModulatedSpawnInterval,
  applyFtueShowcaseFleeAfterFirstCatch,
  removeDespawnedFish,
  spawnFish,
  spawnBaitLureSchool,
  spawnBossFish,
  spawnFishOfType,
  updateFish,
} from './FishSystem';
import {
  attachCatchToSpear,
  detectSpearFishCollisions,
  fireSpear,
  getHarpoonGripWorld,
  getHarpoonMuzzleWorldFromGrip,
  removeResolvedSpears,
  returnSpearWithoutCatch,
  updateSpears,
} from './SpearSystem';
import {
  emitCatchPayoffFX,
  emitFloatingText,
  emitHitParticles,
  emitHookImpactFX,
  moneyTextTier,
  updateFloatingTexts,
  updateParticles,
} from './ParticleSystem';

const TUTORIAL_HINT_DURATION_SEC = 4.2;

function pointInMusicMuteButton(canvasX: number, canvasY: number): boolean {
  const r = getInGameMusicButtonRect();
  return canvasX >= r.x && canvasY >= r.y && canvasX <= r.x + r.w && canvasY <= r.y + r.h;
}

function filterMusicMuteTaps(state: FullGameState, commands: GameInputCommand[]): GameInputCommand[] {
  const out: GameInputCommand[] = [];
  for (const c of commands) {
    if (c.type === 'tap' && pointInMusicMuteButton(c.x, c.y)) {
      state.musicMuted = !state.musicMuted;
      continue;
    }
    out.push(c);
  }
  return out;
}

/** Called once at boot after `createInitialState` (browser reads localStorage). */
export function applyMusicMutedPreference(state: FullGameState, muted: boolean): void {
  state.musicMuted = muted;
}
const CATCH_COIN_BURST_LIFE_SEC = 0.78;
const FTUE_FISH_LESSON_SPAWN_SEC = 0.6;
const FTUE_FISH_LESSON_WAIT_AFTER_CATCH_SEC = 3.5;
const FTUE_FISH_LESSON_ZOOM_IN_SEC = 0.55;
const FTUE_FISH_LESSON_ZOOM_HOLD_SEC = 0.55;
const FTUE_FISH_LESSON_ZOOM_OUT_SEC = 0.65;
const FTUE_FISH_LESSON_ZOOM_MAX = 1.18;
const FTUE_FISH_LESSON_TARGET_X = CANVAS_WIDTH * 0.5;
const FTUE_FISH_LESSON_TARGET_Y = CANVAS_HEIGHT - 430;
const FTUE_CONSUMABLE_ZOOM_IN_SEC = 0.45;
const FTUE_CONSUMABLE_ZOOM_HOLD_SEC = 0.55;
const FTUE_CONSUMABLE_ZOOM_OUT_SEC = 0.55;
const FTUE_CONSUMABLE_ZOOM_MAX = 1.22;
const FTUE_CONSUMABLE_BAIT_PROMPT_DELAY_SEC = 2.0;
const FTUE_CONSUMABLE_NET_PROMPT_DELAY_SEC = 2.0;
const FTUE_TREASURE_SCALE_IN_SEC = 0.55;
const FTUE_TREASURE_PRE_ZOOM_HOLD_SEC = 0.5;
const FTUE_TREASURE_ZOOM_IN_SEC = 0.75;
const FTUE_TREASURE_ZOOM_HOLD_SEC = 0.7;
const FTUE_TREASURE_ZOOM_OUT_SEC = 0.75;
const FTUE_TREASURE_ZOOM_MAX = 1.28;
const FTUE_OXYGEN_LESSON_THRESHOLD = 0.5;
const FTUE_OXYGEN_LESSON_TARGET_X = CANVAS_WIDTH * 0.5;
const FTUE_OXYGEN_LESSON_TARGET_Y = CANVAS_HEIGHT - 430;
const FTUE_OXYGEN_LESSON_SWIM_SPEED = 220;
const FTUE_OXYGEN_LESSON_SPAWN_X = -58;
type ActionUpdateResult = { advanceActionVfx: boolean };
const ACTION_RUNNING: ActionUpdateResult = { advanceActionVfx: true };
const ACTION_PAUSED: ActionUpdateResult = { advanceActionVfx: false };
const TUTORIAL_HINT_COPY: Record<TutorialHintId, { title: string; body: string }> = {
  catchBasics: {
    title: 'Catch fish, then reel them in',
    body: 'Tap a target. You get paid when the spear hauls the catch back.',
  },
  shark: {
    title: 'Shark attack',
    body: 'Hit it multiple times. After each hit, it retreats before charging again.',
  },
  oxygenDamage: {
    title: 'Protect your oxygen',
    body: 'A shark bite damages your tank and costs air. Keep it away from the bottom.',
  },
  gear: {
    title: 'Use gear during a dive',
    body: 'Bait pulls fish in. The net sweeps the screen for quick catches.',
  },
  upgrades: {
    title: 'Spend cash between dives',
    body: 'Upgrade your spear, haul value, and oxygen to push deeper.',
  },
  combo: {
    title: 'Combos pay more',
    body: 'Chain catches quickly to boost the payout on the next fish.',
  },
};

function createTutorialSeenState(): TutorialSeenState {
  return {
    catchBasics: false,
    shark: false,
    oxygenDamage: false,
    gear: false,
    upgrades: false,
    combo: false,
  };
}

function createFtueRuntimeState(): FullGameState['ftue'] {
  return {
    stage: 'none',
    prompt: null,
    treasureIntroTimer: 0,
    fishLessonTimer: 0,
    fishLessonCatchWaitTimer: 0,
    consumableLessonTimer: 0,
    oxygenLessonShown: false,
    oxygenLessonTimer: 0,
    oxygenLessonFishId: null,
    freeConsumablesGranted: false,
    usedNet: false,
    usedBait: false,
    sharkFtuePulseT: 0,
  };
}

function createFakeLeaderboardEntries(bestFishCaught = 0): LeaderboardEntry[] {
  const player: LeaderboardEntry = {
    rank: 0,
    name: 'YOU',
    fishCaught: bestFishCaught,
    isPlayer: true,
  };
  return [...LEADERBOARD_PLACEHOLDER_NPCS, player]
    .sort((a, b) => b.fishCaught - a.fishCaught)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
    .slice(0, 10);
}

function triggerTutorialHint(state: FullGameState, id: TutorialHintId): void {
  if (state.tutorial.seen[id]) return;
  state.tutorial.seen[id] = true;
  state.tutorial.activeId = id;
  state.tutorial.activeTimer = TUTORIAL_HINT_DURATION_SEC;
  state.pendingEvents.push({ type: 'tutorialHintShown', id });
}

function updateTutorialHintTimer(state: FullGameState, dt: number): void {
  if (state.tutorial.activeTimer <= 0) return;
  state.tutorial.activeTimer = Math.max(0, state.tutorial.activeTimer - dt);
  if (state.tutorial.activeTimer === 0) {
    state.tutorial.activeId = null;
  }
}

function setSharkFleeVelocity(fish: { x: number; y: number; vx: number; vy: number }, speed: number): void {
  const dx = fish.x - PLAYER_X;
  const dy = fish.y - PLAYER_Y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  fish.vx = (dx / dist) * speed;
  fish.vy = (dy / dist) * speed;
}

function getSharkVisibleStagePoint(fish: { x: number; y: number }): { x: number; y: number } {
  const minY = CANVAS_HEIGHT * SHARK_ATTACK_STAGE_MIN_Y_FRAC;
  const maxY = CANVAS_HEIGHT * SHARK_ATTACK_STAGE_MAX_Y_FRAC;
  const stageX = fish.x < CANVAS_WIDTH / 2
    ? SHARK_ATTACK_STAGE_MARGIN_X
    : CANVAS_WIDTH - SHARK_ATTACK_STAGE_MARGIN_X;
  return {
    x: stageX,
    y: Math.max(minY, Math.min(maxY, fish.y)),
  };
}

function moveSharkTowardStagePoint(fish: { x: number; y: number; vx: number; vy: number }): boolean {
  const target = getSharkVisibleStagePoint(fish);
  const dx = target.x - fish.x;
  const dy = target.y - fish.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 18) {
    fish.vx = 0;
    fish.vy = 0;
    return true;
  }
  fish.vx = (dx / dist) * SHARK_ATTACK_STAGE_SPEED;
  fish.vy = (dy / dist) * SHARK_ATTACK_STAGE_SPEED;
  return false;
}

function getSharkHitsToKill(speargunLevel: number): number {
  return Math.max(1, 5 - Math.max(1, Math.min(4, speargunLevel)));
}

function getSharkReattackWait(rng: Rng): number {
  return rng.between(SHARK_REATTACK_WAIT_MIN_SEC, SHARK_REATTACK_WAIT_MAX_SEC);
}

function countAliveFish(fish: FullGameState['fish'], type?: FishType): number {
  let count = 0;
  for (const current of fish) {
    if (!current.alive) continue;
    if (type != null && current.type !== type) continue;
    count += 1;
  }
  return count;
}

function isFtueFlowActive(state: FullGameState): boolean {
  return state.ftue.stage !== 'none' && state.ftue.stage !== 'complete';
}

function spawnCatchCoinBurst(state: FullGameState, x: number, y: number, value: number): void {
  state.catchCoinBursts.push({
    x,
    y,
    value,
    elapsed: 0,
    coinCount: Math.min(12, Math.max(4, 3 + Math.floor(Math.log2(value + 4)))),
  });
}

function spawnFtueIncomingShark(state: FullGameState): void {
  state.fish = [{
    id: state.nextFishId++,
    x: CANVAS_WIDTH * 0.5,
    y: CANVAS_HEIGHT * 0.36,
    vx: 0,
    vy: 0,
    wanderTimer: 9999,
    age: SHARK_AGGRO_DELAY,
    hasAttacked: false,
    type: FishType.Large,
    alive: true,
    hitFlash: 0,
    drawScale: 1.22,
    hitPoints: 1,
    sharkAttackPhase: 'charging',
    sharkChargeTimer: SHARK_ATTACK_GROW_SEC,
  }];
}

function completeFtue(state: FullGameState): void {
  if (state.ftue.stage === 'complete') return;
  state.ftue.stage = 'complete';
  state.ftue.prompt = null;
  state.ftueActive = false;
  state.pendingEvents.push({ type: 'ftueDiveExited' });
}

function getFtueTreasureReward(state: FullGameState): number {
  return state.upgrades.speargun < UPGRADE_MAX_LEVEL
    ? getUpgradeCost('speargun', state.upgrades.speargun)
    : getUpgradeCost('speargun', 1);
}

function spawnFtueTreasureChest(state: FullGameState): void {
  if (state.fish.some((fish) => fish.alive && fish.fixedCatchValue != null)) return;
  state.ftue.treasureIntroTimer = 0;
  state.ftue.prompt = 'treasureIntro';
  state.fish.push({
    id: state.nextFishId++,
    x: CANVAS_WIDTH * 0.5,
    y: Math.round(CANVAS_HEIGHT * 0.38),
    vx: 0,
    vy: 0,
    wanderTimer: 9999,
    age: 0,
    hasAttacked: false,
    type: FishType.Treasure,
    alive: true,
    hitFlash: 0,
    drawScale: 0.12,
    fixedCatchValue: getFtueTreasureReward(state),
  });
}

function markExistingFtueFishLessonTarget(state: FullGameState): boolean {
  if (state.fish.some((fish) => fish.alive && fish.ftueShowcase)) return true;
  let target: FullGameState['fish'][number] | null = null;
  let bestD2 = Number.POSITIVE_INFINITY;
  for (const fish of state.fish) {
    if (!fish.alive || fish.ftueFleeing) continue;
    if (fish.type === FishType.Large || fish.type === FishType.Boss || fish.type === FishType.Treasure) continue;
    if (fish.x <= 32 || fish.x >= CANVAS_WIDTH - 32) continue;
    if (fish.y <= CANVAS_HEIGHT * 0.16 || fish.y >= CANVAS_HEIGHT * 0.75) continue;
    const dx = fish.x - FTUE_FISH_LESSON_TARGET_X;
    const dy = fish.y - FTUE_FISH_LESSON_TARGET_Y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      target = fish;
      bestD2 = d2;
    }
  }
  if (target == null) return false;
  target.x = FTUE_FISH_LESSON_TARGET_X;
  target.y = FTUE_FISH_LESSON_TARGET_Y;
  target.vx = 0;
  target.vy = 0;
  target.wanderTimer = 9999;
  target.ftueShowcase = true;
  state.ftue.fishLessonTimer = 0;
  return true;
}

function spawnFtueOxygenLessonFish(state: FullGameState): void {
  if (state.ftue.oxygenLessonFishId != null) return;
  const id = state.nextFishId++;
  state.fish.push({
    id,
    x: FTUE_OXYGEN_LESSON_SPAWN_X,
    y: FTUE_OXYGEN_LESSON_TARGET_Y,
    vx: FTUE_OXYGEN_LESSON_SWIM_SPEED,
    vy: 0,
    wanderTimer: 9999,
    age: 0,
    hasAttacked: false,
    type: FishType.Puffer,
    alive: true,
    hitFlash: 0,
    ftueShowcase: true,
  });
  state.ftue.oxygenLessonFishId = id;
}

function updateFtueOxygenLessonFish(state: FullGameState, dt: number): void {
  const fishId = state.ftue.oxygenLessonFishId;
  if (fishId == null) return;
  const fish = state.fish.find((current) => current.id === fishId && current.alive);
  if (fish == null) {
    state.ftue.oxygenLessonFishId = null;
    state.ftue.prompt = null;
    return;
  }
  if (state.ftue.prompt === 'oxygenLimit') {
    fish.x = FTUE_OXYGEN_LESSON_TARGET_X;
    fish.y = FTUE_OXYGEN_LESSON_TARGET_Y;
    fish.vx = 0;
    fish.vy = 0;
    fish.wanderTimer = 9999;
    return;
  }
  const nextX = Math.min(FTUE_OXYGEN_LESSON_TARGET_X, fish.x + FTUE_OXYGEN_LESSON_SWIM_SPEED * dt);
  fish.x = nextX;
  fish.y = FTUE_OXYGEN_LESSON_TARGET_Y;
  fish.vx = FTUE_OXYGEN_LESSON_SWIM_SPEED;
  fish.vy = 0;
  fish.wanderTimer = 9999;
  if (nextX >= FTUE_OXYGEN_LESSON_TARGET_X) {
    fish.x = FTUE_OXYGEN_LESSON_TARGET_X;
    fish.vx = 0;
    state.ftue.prompt = 'oxygenLimit';
  }
}

function getFtueTreasureIntroTotalSec(): number {
  return FTUE_TREASURE_PRE_ZOOM_HOLD_SEC
    + FTUE_TREASURE_ZOOM_IN_SEC
    + FTUE_TREASURE_ZOOM_HOLD_SEC
    + FTUE_TREASURE_ZOOM_OUT_SEC;
}

function getFtueTreasureZoom(timer: number): number {
  const zoomTimer = Math.max(0, timer - FTUE_TREASURE_PRE_ZOOM_HOLD_SEC);
  const inEnd = FTUE_TREASURE_ZOOM_IN_SEC;
  const holdEnd = inEnd + FTUE_TREASURE_ZOOM_HOLD_SEC;
  const outEnd = holdEnd + FTUE_TREASURE_ZOOM_OUT_SEC;
  let p = 0;
  if (zoomTimer < inEnd) {
    p = zoomTimer / Math.max(1e-6, FTUE_TREASURE_ZOOM_IN_SEC);
  } else if (zoomTimer < holdEnd) {
    p = 1;
  } else if (zoomTimer < outEnd) {
    p = 1 - (zoomTimer - holdEnd) / Math.max(1e-6, FTUE_TREASURE_ZOOM_OUT_SEC);
  }
  const u = Math.min(1, Math.max(0, p));
  const smooth = u * u * (3 - 2 * u);
  return 1 + (FTUE_TREASURE_ZOOM_MAX - 1) * smooth;
}

function getFtueTreasureFocusBlend(timer: number): number {
  const zoomTimer = Math.max(0, timer - FTUE_TREASURE_PRE_ZOOM_HOLD_SEC);
  const u = Math.min(1, Math.max(0, zoomTimer / Math.max(1e-6, FTUE_TREASURE_ZOOM_IN_SEC)));
  return u * u * (3 - 2 * u);
}

function getFtueFishLessonCameraProgress(timer: number): number {
  const inEnd = FTUE_FISH_LESSON_ZOOM_IN_SEC;
  const holdEnd = inEnd + FTUE_FISH_LESSON_ZOOM_HOLD_SEC;
  const outEnd = holdEnd + FTUE_FISH_LESSON_ZOOM_OUT_SEC;
  let p = 0;
  if (timer < inEnd) {
    p = timer / Math.max(1e-6, FTUE_FISH_LESSON_ZOOM_IN_SEC);
  } else if (timer < holdEnd) {
    p = 1;
  } else if (timer < outEnd) {
    p = 1 - (timer - holdEnd) / Math.max(1e-6, FTUE_FISH_LESSON_ZOOM_OUT_SEC);
  }
  const u = Math.min(1, Math.max(0, p));
  return u * u * (3 - 2 * u);
}

function getFtueFishLessonZoom(timer: number): number {
  const p = getFtueFishLessonCameraProgress(timer);
  return 1 + (FTUE_FISH_LESSON_ZOOM_MAX - 1) * p;
}

function getFtueFishLessonFocusBlend(timer: number): number {
  return getFtueFishLessonCameraProgress(timer);
}

function getFtueConsumableZoom(timer: number): number {
  const inEnd = FTUE_CONSUMABLE_ZOOM_IN_SEC;
  const holdEnd = inEnd + FTUE_CONSUMABLE_ZOOM_HOLD_SEC;
  const outEnd = holdEnd + FTUE_CONSUMABLE_ZOOM_OUT_SEC;
  let p = 0;
  if (timer < inEnd) {
    p = timer / Math.max(1e-6, FTUE_CONSUMABLE_ZOOM_IN_SEC);
  } else if (timer < holdEnd) {
    p = 1;
  } else if (timer < outEnd) {
    p = 1 - (timer - holdEnd) / Math.max(1e-6, FTUE_CONSUMABLE_ZOOM_OUT_SEC);
  }
  const u = Math.min(1, Math.max(0, p));
  const smooth = u * u * (3 - 2 * u);
  return 1 + (FTUE_CONSUMABLE_ZOOM_MAX - 1) * smooth;
}

function markFtueConsumableUsed(state: FullGameState, id: 'net' | 'bait'): void {
  if (state.ftue.stage !== 'secondDiveConsumables') return;
  if (id === 'bait' && state.ftue.prompt === 'useBait') {
    state.ftue.usedBait = true;
    state.ftue.prompt = null;
    state.ftue.consumableLessonTimer = 0;
    return;
  }
  if (id === 'net' && state.ftue.prompt === 'useNet') {
    state.ftue.usedNet = true;
    completeFtue(state);
  }
}

function updateCatchCoinBursts(state: FullGameState, dt: number): void {
  for (const burst of state.catchCoinBursts) {
    burst.elapsed += dt;
  }
  state.catchCoinBursts = state.catchCoinBursts.filter((burst) => burst.elapsed < CATCH_COIN_BURST_LIFE_SEC);
}

export function applyTutorialSeenState(state: FullGameState, seen: Partial<TutorialSeenState>): void {
  state.tutorial.seen = { ...state.tutorial.seen, ...seen };
}

export function applyFtueOxygenLessonSeen(state: FullGameState, seen: boolean): void {
  state.ftue.oxygenLessonShown = seen;
}

export function setLeaderboardEntries(
  state: FullGameState,
  entries: LeaderboardEntry[],
  bestFishCaught = state.leaderboard.bestFishCaught,
  lastSubmittedFishCaught = state.leaderboard.lastSubmittedFishCaught,
  bestRunMoney = state.leaderboard.bestRunMoney,
  bestRunFishCaught = state.leaderboard.bestRunFishCaught,
  allTimeFishCaught = state.leaderboard.allTimeFishCaught,
): void {
  state.leaderboard = {
    entries,
    bestFishCaught,
    lastSubmittedFishCaught,
    bestRunMoney,
    bestRunFishCaught,
    allTimeFishCaught,
  };
}

function decayHudConsumableFlash(state: FullGameState, dt: number): void {
  state.hudConsumableFlash.net = Math.max(0, state.hudConsumableFlash.net - dt);
  state.hudConsumableFlash.bait = Math.max(0, state.hudConsumableFlash.bait - dt);
}

/**
 * Scripted FTUE: jump straight to Action, stage a shark, then gift upgrade currency.
 * Caller should only run when local / platform says first visit.
 */
export function bootstrapActionFtueDive(state: FullGameState): void {
  state.ftueActive = true;
  state.phase = GamePhase.Action;
  state.diveTimer = 0;
  resetForNewDive(state);
  state.ftue = createFtueRuntimeState();
  state.ftue.stage = 'sharkEncounter';
  state.ftue.prompt = 'tapFightBack';
  spawnFtueIncomingShark(state);
  state.fishSpawnTimer = 8_000_000_000_000;
  state.treasureSpawnTimer = 8_000_000_000_000;
  state.bossSpawnTimer = 8_000_000_000_000;
  state.pendingEvents.push({ type: 'diveStarted' });
}

export function createInitialState(): FullGameState {
  const upgrades: UpgradeState = { speargun: 1, haul: 1, oxygen: 1 };
  const consumables: ConsumableState = { net: 0, bait: 0 };

  return {
    phase: GamePhase.Boat,
    money: 0,
    upgrades,
    consumables,
    ftueActive: false,
    musicMuted: false,
    player: { x: PLAYER_X, y: PLAYER_Y, aimAngle: -Math.PI / 2, shootCooldown: 0 },
    spears: [],
    fish: [],
    particles: [],
    floatingTexts: [],
    catchCoinBursts: [],
    roundTimeLeft: 0,
    roundTimeMax: getMaxOxygen(upgrades),
    sessionEarnings: 0,
    sessionCatchCount: 0,
    sessionTime: 0,
    comboCount: 0,
    comboTimer: 0,
    oxyBoostTimer: 0,
    upgradePanelOpen: null,
    boatLeaderboardOpen: false,
    treasureSpawnTimer: TREASURE_SPAWN_INTERVAL,
    bossSpawnTimer: BOSS_SPAWN_FIRST_DELAY,
    lastRunEarnings: 0,
    lastRunDurationSec: 0,
    lastRunCatchCount: 0,
    treasureReveal: null,
    nextFishId: 1,
    nextSpearId: 1,
    lastWaveBurstIndex: -1,
    fishSpawnTimer: 0,
    baitActive: false,
    baitTimer: 0,
    baitX: 0,
    baitY: 0,
    shakeIntensity: 0,
    shakeX: 0,
    shakeY: 0,
    catchFlash: 0,
    sharkBiteFlash: 0,
    sharkBiteTeethElapsed: -1,
    oxygenDamageTimer: 0,
    oxygenDamageAmount: 0,
    diveTimer: 0,
    breachTimer: 0,
    oceanBubbles: [],
    diveJumpSfxPlayed: false,
    diveSplashEmitted: false,
    breachLeaderboardDismissed: false,
    breachLeaderboardFadeElapsed: 0,
    upgradeBackHighlightTimer: 0,
    pendingEvents: [],
    hudConsumableFlash: { net: 0, bait: 0 },
    netVfx: null,
    harpoonGunAnimElapsed: -1,
    tutorial: {
      seen: createTutorialSeenState(),
      activeId: null,
      activeTimer: 0,
    },
    ftue: createFtueRuntimeState(),
    leaderboard: {
      bestFishCaught: 0,
      lastSubmittedFishCaught: 0,
      bestRunMoney: 0,
      bestRunFishCaught: 0,
      allTimeFishCaught: 0,
      entries: createFakeLeaderboardEntries(),
    },
  };
}

function resetForNewDive(state: FullGameState): void {
  state.sessionTime = 0;
  state.roundTimeMax = getMaxOxygen(state.upgrades);
  state.roundTimeLeft = state.roundTimeMax;
  state.sessionEarnings = 0;
  state.sessionCatchCount = 0;
  state.comboCount = 0;
  state.comboTimer = 0;
  state.spears = [];
  state.fish = [];
  state.particles = [];
  state.floatingTexts = [];
  state.catchCoinBursts = [];
  state.fishSpawnTimer = 0.1;
  state.player.x = PLAYER_X;
  state.player.y = PLAYER_Y;
  state.player.shootCooldown = 0;
  state.player.aimAngle = -Math.PI / 2;
  state.baitActive = false;
  state.baitTimer = 0;
  state.treasureSpawnTimer = TREASURE_SPAWN_INTERVAL;
  state.bossSpawnTimer = BOSS_SPAWN_FIRST_DELAY;
  state.lastWaveBurstIndex = -1;
  state.shakeIntensity = 0;
  state.shakeX = 0;
  state.shakeY = 0;
  state.catchFlash = 0;
  state.sharkBiteFlash = 0;
  state.sharkBiteTeethElapsed = -1;
  state.oxygenDamageTimer = 0;
  state.oxygenDamageAmount = 0;
  state.treasureReveal = null;
  state.hudConsumableFlash = { net: 0, bait: 0 };
  state.netVfx = null;
  state.harpoonGunAnimElapsed = -1;
  state.breachLeaderboardDismissed = false;
  state.breachLeaderboardFadeElapsed = 0;
  state.boatLeaderboardOpen = false;
}

function beginBreaching(state: FullGameState): void {
  clearNetVfxApplyingIfNeeded(state, getGameRng());
  state.roundTimeLeft = 0;
  playGameToMenuTransition(state);
}

function finalizeRunToBoat(state: FullGameState): void {
  clearNetVfxApplyingIfNeeded(state, getGameRng());
  state.boatLeaderboardOpen = false;
  state.diveJumpSfxPlayed = false;
  state.diveSplashEmitted = false;
  state.diveTimer = 0;
  state.phase = GamePhase.Boat;
  state.lastRunEarnings = state.sessionEarnings;
  state.lastRunDurationSec = state.sessionTime;
  state.lastRunCatchCount = state.sessionCatchCount;
  state.sessionTime = 0;
  state.comboCount = 0;
  state.comboTimer = 0;
  state.spears = [];
  state.fish = [];
  state.particles = [];
  state.floatingTexts = [];
  state.catchCoinBursts = [];
  state.shakeIntensity = 0;
  state.shakeX = 0;
  state.shakeY = 0;
  state.catchFlash = 0;
  state.sharkBiteFlash = 0;
  state.sharkBiteTeethElapsed = -1;
  state.oxygenDamageTimer = 0;
  state.oxygenDamageAmount = 0;
  state.treasureReveal = null;
  state.hudConsumableFlash = { net: 0, bait: 0 };
  state.harpoonGunAnimElapsed = -1;
  state.pendingEvents.push({
    type: 'runEnded',
    earnings: state.lastRunEarnings,
    runDurationSec: state.lastRunDurationSec,
    catchCount: state.lastRunCatchCount,
  });
  state.sessionEarnings = 0;
  state.sessionCatchCount = 0;
  if (state.ftue.stage === 'treasureUpgrade') {
    state.ftue.prompt = 'upgradeHarpoon';
    state.upgradePanelOpen = null;
    state.boatLeaderboardOpen = false;
    state.upgradeBackHighlightTimer = 2.4;
  } else if (state.lastRunCatchCount > 0) {
    triggerTutorialHint(state, 'upgrades');
  }
}

function updateBoat(state: FullGameState, commands: GameInputCommand[]): void {
  for (const command of commands) {
    if (command.type === 'openBoatLeaderboard') {
      state.upgradePanelOpen = null;
      state.boatLeaderboardOpen = true;
      continue;
    }
    if (command.type === 'closeBoatLeaderboard') {
      state.boatLeaderboardOpen = false;
      continue;
    }

    if (command.type === 'divePress') {
      state.upgradePanelOpen = null;
      state.boatLeaderboardOpen = false;
      resetForNewDive(state);
      if (state.ftue.stage === 'secondDiveConsumables') {
        if (!state.ftue.freeConsumablesGranted) {
          state.consumables.net = Math.min(NET_MAX_STOCK, state.consumables.net + 1);
          state.consumables.bait = Math.min(BAIT_MAX_STOCK, state.consumables.bait + 1);
          state.ftue.freeConsumablesGranted = true;
        }
        state.ftue.prompt = null;
        state.ftue.consumableLessonTimer = 0;
      }
      playMenuToGameTransition(state);
      continue;
    }

    if (command.type === 'openUpgradePanel') {
      // Toggle: tap same button again to close
      state.upgradePanelOpen = state.upgradePanelOpen === command.id ? null : command.id;
      continue;
    }

    if (command.type === 'buyUpgrade') {
      const id = command.id as keyof UpgradeState;
      const currentLevel = state.upgrades[id];
      if (currentLevel >= UPGRADE_MAX_LEVEL) continue;
      const cost = getUpgradeCost(id, currentLevel);
      if (state.money < cost) continue;
      state.money -= cost;
      state.upgrades[id] += 1;
      state.upgradeBackHighlightTimer = 2.4;
      state.pendingEvents.push({ type: 'upgradeBought', id });
      if (state.ftue.stage === 'treasureUpgrade' && id === 'speargun') {
        state.ftue.stage = 'secondDiveConsumables';
        state.ftue.prompt = null;
        state.upgradePanelOpen = null;
      } else {
        triggerTutorialHint(state, 'upgrades');
      }
      continue;
    }

    if (command.type === 'buyConsumable') {
      if (command.id === 'net') {
        if (state.consumables.net >= NET_MAX_STOCK || state.money < NET_COST) continue;
        state.money -= NET_COST;
        state.consumables.net += 1;
      } else if (command.id === 'bait') {
        if (state.consumables.bait >= BAIT_MAX_STOCK || state.money < BAIT_COST) continue;
        state.money -= BAIT_COST;
        state.consumables.bait += 1;
      }
      triggerTutorialHint(state, 'gear');
      continue;
    }
  }
}

function updateTreasureReveal(state: FullGameState, dt: number, r: Rng): void {
  const tr = state.treasureReveal;
  if (tr == null) return;
  tr.elapsed += dt;
  if (!tr.opened && tr.elapsed >= tr.awardAtSec * 0.9) {
    tr.opened = true;
  }
  if (!tr.awarded && tr.elapsed >= tr.awardAtSec) {
    tr.awarded = true;
    const totalReward = tr.value;
    const moneyBefore = state.money;
    state.money += totalReward;
    tr.moneyLerpFrom = moneyBefore;
    tr.moneyLerpTo = state.money;
    state.sessionEarnings += totalReward;
    state.sessionCatchCount += 1;
    triggerTutorialHint(state, 'catchBasics');
    if (tr.comboBonus > 0) triggerTutorialHint(state, 'combo');
    emitCatchPayoffFX(state.particles, tr.x, tr.y, FishType.Treasure, totalReward, r);
    state.catchFlash = Math.max(
      state.catchFlash,
      Math.min(CATCH_FLASH_CAP, 0.04 + Math.min(0.15, totalReward / 400 * 0.095)),
    );
    const comboShakeScale = tr.totalComboForLine > 1 ? SHAKE_COMBO_SCALE : 1;
    state.shakeIntensity += SHAKE_ON_CATCH * comboShakeScale;
    state.pendingEvents.push({
      type: 'fishCaught',
      x: tr.x,
      y: tr.y,
      value: totalReward,
      fishType: FishType.Treasure,
    });
  }
  if (tr.elapsed >= tr.durationSec) {
    state.treasureReveal = null;
  }
}

function updateDiving(state: FullGameState, dt: number): void {
  updateDiveTransition(state, dt);
}

function updateBreaching(state: FullGameState, dt: number, commands: GameInputCommand[]): void {
  for (const command of commands) {
    if (command.type === 'confirmBreachToBoat' && isBreachingAwaitingConfirm(state)) {
      state.breachLeaderboardDismissed = true;
      state.breachLeaderboardFadeElapsed = 0;
      break;
    }
  }
  updateDiveTransition(state, dt);
  if (state.breachTimer >= OCEAN_BREACH_TOTAL_SEC) {
    state.breachTimer = OCEAN_BREACH_TOTAL_SEC;
    state.oceanBubbles = [];
    finalizeRunToBoat(state);
  }
}

function applyNetCatchSweep(state: FullGameState, rng: Rng): void {
  for (const fish of state.fish) {
    if (!fish.alive) continue;
    if (fish.type === FishType.Boss) {
      if (state.upgrades.speargun < BOSS_MIN_SPEAR_LEVEL_TO_DAMAGE) {
        emitHitParticles(state.particles, fish.x, fish.y, fish.type, rng);
        state.floatingTexts.push({
          x: fish.x,
          y: fish.y - 40,
          vy: -48,
          text: 'ARMOR!',
          life: 0.9,
          maxLife: 0.9,
        });
        continue;
      }
      const prev = fish.hitPoints ?? BOSS_FISH_MAX_HP;
      const next = Math.max(0, prev - BOSS_NET_DAMAGE);
      fish.hitPoints = next;
      fish.hitFlash = 1.0;
      emitHitParticles(state.particles, fish.x, fish.y, fish.type, rng);
      state.floatingTexts.push({
        x: fish.x,
        y: fish.y - 36,
        vy: -44,
        text: `-${BOSS_NET_DAMAGE}`,
        life: 0.75,
        maxLife: 0.75,
      });
      if (next > 0) {
        state.shakeIntensity += 2.4;
        continue;
      }
      fish.alive = false;
      const value = Math.floor(
        getFishValue(fish.type, state.sessionTime, getValueMultiplier(state.upgrades), rng)
        * getHaulMultiplier(state.upgrades),
      );
      state.money += value;
      state.sessionEarnings += value;
      state.sessionCatchCount += 1;
      emitCatchPayoffFX(state.particles, fish.x, fish.y, fish.type, value, rng);
      spawnCatchCoinBurst(state, fish.x, fish.y - 8, value);
      emitFloatingText(state.floatingTexts, fish.x, fish.y - 20, value, { pop: true, tier: moneyTextTier(value) });
      state.catchFlash = Math.max(
        state.catchFlash,
        Math.min(CATCH_FLASH_CAP, 0.05 + Math.min(0.12, value / 500 * 0.1)),
      );
      state.shakeIntensity += 4.5;
      continue;
    }
    fish.alive = false;
    applyFtueShowcaseFleeAfterFirstCatch(state.fish, fish);
    const value = Math.floor(
      getFishValue(fish.type, state.sessionTime, getValueMultiplier(state.upgrades), rng)
      * getHaulMultiplier(state.upgrades),
    );
    state.money += value;
    state.sessionEarnings += value;
    state.sessionCatchCount += 1;
    emitHitParticles(state.particles, fish.x, fish.y, fish.type, rng, 0.85);
    spawnCatchCoinBurst(state, fish.x, fish.y - 8, value);
    emitFloatingText(state.floatingTexts, fish.x, fish.y - 20, value, { pop: value >= 35, tier: moneyTextTier(value) });
  }
  state.shakeIntensity += 4.0;
}

function clearNetVfxApplyingIfNeeded(state: FullGameState, rng: Rng): void {
  if (state.netVfx == null) return;
  if (!state.netVfx.catchesApplied) applyNetCatchSweep(state, rng);
  state.netVfx = null;
}

function updateNetVfx(state: FullGameState, dt: number, rng: Rng): void {
  if (state.netVfx == null) return;
  state.netVfx.elapsed += dt;
  if (!state.netVfx.catchesApplied && state.netVfx.elapsed >= NET_VFX_CATCH_AT_SEC) {
    applyNetCatchSweep(state, rng);
    state.netVfx.catchesApplied = true;
  }
  if (state.netVfx.elapsed >= NET_VFX_TOTAL_SEC) {
    state.netVfx = null;
  }
}

function updateAction(state: FullGameState, dt: number, commands: GameInputCommand[]): ActionUpdateResult {
  const rng = getGameRng();
  decayHudConsumableFlash(state, dt);
  if (state.catchFlash > 0) {
    state.catchFlash = Math.max(0, state.catchFlash - CATCH_FLASH_DECAY * dt);
  }
  if (state.sharkBiteFlash > 0) {
    state.sharkBiteFlash = Math.max(0, state.sharkBiteFlash - SHARK_BITE_FLASH_DECAY * dt);
  }
  if (state.oxygenDamageTimer > 0) {
    state.oxygenDamageTimer = Math.max(0, state.oxygenDamageTimer - dt);
  }
  updateFtueOxygenLessonFish(state, dt);

  if (
    state.ftue.stage === 'sharkEncounter'
    && state.ftueActive
    && state.ftue.prompt === 'tapFightBack'
  ) {
    state.ftue.sharkFtuePulseT += dt;
  }

  const gameplayCommands = filterMusicMuteTaps(state, commands);

  if (state.ftue.stage === 'sharkEncounter' && state.ftueActive) {
    if (!commands.some((command) => command.type === 'tap')) {
      return ACTION_PAUSED;
    }
    state.ftueActive = false;
    state.ftue.prompt = null;
    state.fishSpawnTimer = 0.1;
    state.bossSpawnTimer = BOSS_SPAWN_FIRST_DELAY;
  }

  if (state.ftue.stage === 'firstFishIntro') {
    state.ftue.fishLessonTimer += dt;
    if (
      state.ftue.fishLessonTimer >= FTUE_FISH_LESSON_SPAWN_SEC
      && markExistingFtueFishLessonTarget(state)
    ) {
      state.ftue.stage = 'firstFishCatch';
      state.ftue.prompt = 'catchFish';
      state.treasureSpawnTimer = 8_000_000_000_000;
      state.bossSpawnTimer = 8_000_000_000_000;
    }
  }

  if (state.ftue.stage === 'firstFishCatch') {
    state.ftue.fishLessonTimer += dt;
  }
  const hadFtueConsumablePromptAtFrameStart = state.ftue.stage === 'secondDiveConsumables'
    && (state.ftue.prompt === 'useBait' || state.ftue.prompt === 'useNet');
  if (
    state.ftue.stage === 'secondDiveConsumables'
  ) {
    state.ftue.consumableLessonTimer += dt;
    if (!state.ftue.usedBait && state.ftue.prompt == null) {
      if (state.ftue.consumableLessonTimer >= FTUE_CONSUMABLE_BAIT_PROMPT_DELAY_SEC) {
        state.ftue.prompt = 'useBait';
        state.ftue.consumableLessonTimer = 0;
      }
    } else if (state.ftue.usedBait && !state.ftue.usedNet && state.ftue.prompt == null) {
      if (state.ftue.consumableLessonTimer >= FTUE_CONSUMABLE_NET_PROMPT_DELAY_SEC) {
        state.ftue.prompt = 'useNet';
        state.ftue.consumableLessonTimer = 0;
      }
    }
  }

  if (state.ftue.stage === 'firstFishCaught') {
    state.ftue.fishLessonCatchWaitTimer += dt;
    if (state.ftue.fishLessonCatchWaitTimer >= FTUE_FISH_LESSON_WAIT_AFTER_CATCH_SEC) {
      state.ftue.stage = 'firstTreasureIntro';
      state.ftue.prompt = null;
      state.ftue.treasureIntroTimer = 0;
      state.fish = state.fish.filter((fish) => !fish.ftueShowcase && !fish.ftueFleeing);
      state.fishSpawnTimer = 8_000_000_000_000;
      state.bossSpawnTimer = 8_000_000_000_000;
      spawnFtueTreasureChest(state);
    }
  }

  if (state.ftue.stage === 'firstTreasureIntro') {
    const chest = state.fish.find((fish) => fish.alive && fish.fixedCatchValue != null);
    if (chest != null) {
      state.ftue.treasureIntroTimer += dt;
      chest.x = CANVAS_WIDTH * 0.5;
      chest.vx = 0;
      chest.vy = 0;
      const scaleP = Math.min(1, state.ftue.treasureIntroTimer / FTUE_TREASURE_SCALE_IN_SEC);
      const scaleU = scaleP * scaleP * (3 - 2 * scaleP);
      chest.drawScale = 0.12 + (1.28 - 0.12) * scaleU;
      state.ftue.prompt = 'treasureIntro';
      if (state.ftue.treasureIntroTimer >= getFtueTreasureIntroTotalSec()) {
        state.ftue.stage = 'firstTreasureCatch';
        state.ftue.prompt = 'catchTreasure';
      }
      return ACTION_PAUSED;
    }
  }

  if (state.treasureReveal) {
    updateTreasureReveal(state, dt, rng);
    if (state.treasureReveal) {
      return ACTION_PAUSED;
    }
  }

  const canShoot = state.player.shootCooldown <= 0 && state.spears.length === 0;
  const ftueTreasurePaused = state.ftue.stage === 'firstTreasureCatch';
  const ftueFishLessonPaused = state.ftue.stage === 'firstFishCatch';
  const ftueConsumablePaused = hadFtueConsumablePromptAtFrameStart;
  const ftueOxygenLessonPaused = state.ftue.oxygenLessonFishId != null;
  const timeLeftFraction = state.roundTimeMax > 0 ? state.roundTimeLeft / state.roundTimeMax : 0;
  if (
    !state.ftue.oxygenLessonShown
    && state.ftue.prompt == null
    && state.ftue.stage !== 'firstFishIntro'
    && state.ftue.stage !== 'firstFishCatch'
    && state.ftue.stage !== 'firstTreasureIntro'
    && state.ftue.stage !== 'firstTreasureCatch'
    && state.ftue.stage !== 'secondDiveConsumables'
    && timeLeftFraction <= FTUE_OXYGEN_LESSON_THRESHOLD
    && state.roundTimeLeft > 0
  ) {
    state.ftue.oxygenLessonShown = true;
    state.ftue.oxygenLessonTimer = 0;
    state.ftue.prompt = null;
    spawnFtueOxygenLessonFish(state);
    state.pendingEvents.push({ type: 'ftueOxygenLessonShown' });
  }

  for (const command of gameplayCommands) {
    // Consumable use
    if (command.type === 'useConsumable') {
      if (
        state.ftue.stage === 'secondDiveConsumables'
        && (
          state.ftue.prompt == null
          ||
          (state.ftue.prompt === 'useBait' && command.id !== 'bait')
          || (state.ftue.prompt === 'useNet' && command.id !== 'net')
        )
      ) {
        continue;
      }
      triggerTutorialHint(state, 'gear');
      if (command.id === 'net' && state.consumables.net > 0 && state.netVfx == null) {
        state.consumables.net -= 1;
        state.netVfx = { elapsed: 0, catchesApplied: false };
        state.hudConsumableFlash.net = 0.34;
        markFtueConsumableUsed(state, 'net');
      } else if (command.id === 'bait' && state.consumables.bait > 0) {
        state.consumables.bait -= 1;
        state.baitActive = true;
        state.baitTimer = BAIT_DURATION;
        // Drop at screen center; same `iconBait` art as the boat + HUD
        state.baitX = CANVAS_WIDTH / 2;
        state.baitY = CANVAS_HEIGHT / 2;
        const bnx = state.baitX;
        const bny = state.baitY;
        for (const f of state.fish) {
          if (!f.alive) continue;
          if (f.type === FishType.Boss || f.ftueFleeing) continue;
          const dx = bnx - f.x;
          const dy = bny - f.y;
          const d2 = dx * dx + dy * dy;
          const n2 = BAIT_NUDGE_NEAR_PX * BAIT_NUDGE_NEAR_PX;
          if (d2 >= n2) continue;
          const d = Math.sqrt(d2) + 0.01;
          const t = 1 - d / BAIT_NUDGE_NEAR_PX;
          const s = BAIT_NUDGE_IMPULSE * t;
          f.vx += (dx / d) * s;
          f.vy += (dy / d) * s;
        }
        {
          const liveN = countAliveFish(state.fish);
          const n = Math.min(
            BAIT_SCHOOL_FISH_COUNT,
            Math.max(0, FISH_SPAWN_MAX_ALIVE - liveN),
          );
          if (n > 0) {
            const newFish = spawnBaitLureSchool(
              state.nextFishId,
              rng,
              bnx,
              bny,
              n,
            );
            state.fish.push(...newFish);
            state.nextFishId += n;
          }
        }
        state.hudConsumableFlash.bait = 0.34;
        markFtueConsumableUsed(state, 'bait');
      }
      continue;
    }

    if (command.type !== 'tap') continue;
    if (state.ftue.oxygenLessonFishId != null && state.ftue.prompt !== 'oxygenLimit') continue;

    const ftueFishTarget = state.ftue.stage === 'firstFishCatch'
      ? state.fish.find((fish) => fish.alive && fish.ftueShowcase)
      : state.ftue.prompt === 'oxygenLimit' && state.ftue.oxygenLessonFishId != null
        ? state.fish.find((fish) => fish.id === state.ftue.oxygenLessonFishId && fish.alive)
        : null;
    const w = ftueFishTarget != null
      ? { x: ftueFishTarget.x, y: ftueFishTarget.y }
      : canvasToActionWorld(
        command.x,
        command.y,
        state.shakeX,
        state.shakeY,
        state.player.x,
        state.player.y,
        getActionViewZoomForSession(state.sessionTime, state.ftueActive),
      );
    const grip = getHarpoonGripWorld(state.player.x, state.player.y);
    const dx = w.x - grip.x;
    const dy = w.y - grip.y;
    if (dx !== 0 || dy !== 0) {
      state.player.aimAngle = Math.atan2(dy, dx);
    }

    if (!canShoot) continue;

    state.spears.push(
      fireSpear(
        state.nextSpearId++,
        state.player,
        state.player.aimAngle,
        getSpearMaxDistance(state.upgrades),
      ),
    );
    state.harpoonGunAnimElapsed = 0;
    state.player.shootCooldown = getShootCooldown(state.upgrades);
    state.pendingEvents.push({ type: 'spearFired' });
    break;
  }

  if (ftueConsumablePaused) {
    return ACTION_PAUSED;
  }

  if (state.player.shootCooldown > 0) {
    state.player.shootCooldown = Math.max(0, state.player.shootCooldown - dt);
  }

  if (!ftueTreasurePaused && !ftueFishLessonPaused && !ftueConsumablePaused && !ftueOxygenLessonPaused) {
  if (state.comboTimer > 0) {
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer === 0) {
      state.comboCount = 0;
    }
  }

  if (state.oxyBoostTimer > 0) {
    state.oxyBoostTimer = Math.max(0, state.oxyBoostTimer - dt);
  }

  state.sessionTime += dt;
  state.roundTimeLeft = Math.max(0, state.roundTimeLeft - dt * OXYGEN_DRAIN_RATE);

  // Wave N: start-of-wave cluster; extra from wave is capped, total respects max alive
  if (WAVE_DURATION_SEC > 0) {
    const waveBlock = Math.floor(state.sessionTime / WAVE_DURATION_SEC);
    if (waveBlock > state.lastWaveBurstIndex) {
      const liveNow = countAliveFish(state.fish);
      const spearDensityExtra = Math.ceil(
        Math.max(0, state.upgrades.speargun - 1) / FISH_DENSITY_SPEARGUN_LEVELS_PER_EXTRA,
      );
      const room = Math.max(0, FISH_SPAWN_MAX_ALIVE + spearDensityExtra - liveNow);
      const extra = Math.min(
        WAVE_BURST_EXTRA_CAP,
        WAVE_BURST_EXTRA_PER_WAVE * Math.max(0, waveBlock),
      );
      let n = Math.min(
        WAVE_BURST_MAX_COUNT + spearDensityExtra,
        WAVE_BURST_BASE_COUNT + extra + spearDensityExtra,
      );
      n = Math.min(n, room);
      if (n > 0) {
        const nearN = WAVE_NEAR_SPAWN_FRACTION <= 0
          ? 0
          : n <= 1
            ? 0
            : Math.min(n, Math.max(1, Math.round(n * WAVE_NEAR_SPAWN_FRACTION)));
        let sharksAlive = countAliveFish(state.fish, FishType.Large);
        const avoidRandomShark = isFtueFlowActive(state);
        for (let u = 0; u < nearN; u += 1) {
          const fish = spawnFish(state.nextFishId++, rng, state.sessionTime, {
            spawnInward: true,
            avoidShark: avoidRandomShark || sharksAlive >= SHARK_MAX_ALIVE,
          });
          if (fish.type === FishType.Large) sharksAlive += 1;
          state.fish.push(fish);
        }
        for (let v = 0; v < n - nearN; v += 1) {
          const fish = spawnFish(state.nextFishId++, rng, state.sessionTime, {
            spawnInward: false,
            avoidShark: avoidRandomShark || sharksAlive >= SHARK_MAX_ALIVE,
          });
          if (fish.type === FishType.Large) sharksAlive += 1;
          state.fish.push(fish);
        }
      }
      state.lastWaveBurstIndex = waveBlock;
    }
  }

  const waveIdx = WAVE_DURATION_SEC > 0 ? Math.floor(state.sessionTime / WAVE_DURATION_SEC) : 0;
  const waveIntScale = Math.min(
    FISH_SPAWN_WAVE_INTERVAL_SCALE_CAP,
    1 + waveIdx * FISH_SPAWN_WAVE_INTERVAL_SCALE_PER_WAVE,
  );

  state.fishSpawnTimer -= dt;
  if (state.fishSpawnTimer <= 0) {
    const liveFish = countAliveFish(state.fish);
    if (liveFish < FISH_SPAWN_MAX_ALIVE) {
      const sharksAlive = countAliveFish(state.fish, FishType.Large);
      state.fish.push(spawnFish(state.nextFishId++, rng, state.sessionTime, {
        avoidShark: isFtueFlowActive(state) || sharksAlive >= SHARK_MAX_ALIVE,
      }));
    }
    state.fishSpawnTimer = getModulatedSpawnInterval(state.sessionTime) * waveIntScale;
  }

  // Treasure fish — periodic spawn, every wave / dive
  state.treasureSpawnTimer -= dt;
  if (state.treasureSpawnTimer <= 0) {
    if (state.ftue.stage === 'firstTreasureIntro') {
      spawnFtueTreasureChest(state);
      state.treasureSpawnTimer = 8_000_000_000_000;
    } else {
      state.fish.push(spawnFishOfType(state.nextFishId++, rng, FishType.Treasure));
      state.treasureSpawnTimer = TREASURE_SPAWN_INTERVAL;
    }
  }

  // Rock boss — timer always runs; only spawns once min time + first delay / interval (was stuck before 28s)
  state.bossSpawnTimer -= dt;
  if (
    state.sessionTime >= BOSS_SPAWN_MIN_TIME
    && state.bossSpawnTimer <= 0
    && !state.fish.some((f) => f.type === FishType.Boss && f.alive)
  ) {
    state.fish.push(spawnBossFish(state.nextFishId++, rng));
    state.bossSpawnTimer = BOSS_SPAWN_INTERVAL;
  }

  // Bait timer
  if (state.baitActive) {
    state.baitTimer -= dt;
    if (state.baitTimer <= 0) {
      state.baitActive = false;
      state.baitTimer = 0;
    }
  }

  updateFish(
    state.fish, dt, rng,
    state.baitActive ? state.baitX : null,
    state.baitActive ? state.baitY : null,
  );

  // ── Shark attack ─────────────────────────────────────────────────────────
  let sharkBiteThisFrame = false;
  const sharkMaxHp = getSharkHitsToKill(state.upgrades.speargun);
  for (const fish of state.fish) {
    if (fish.type !== FishType.Large || !fish.alive) continue;
    if ((fish.hitPoints ?? sharkMaxHp) > 0 && fish.hitPoints == null) {
      fish.hitPoints = sharkMaxHp;
    }
    if ((fish.sharkFleeTimer ?? 0) > 0) {
      const nextFlee = Math.max(0, (fish.sharkFleeTimer ?? 0) - dt);
      fish.sharkFleeTimer = nextFlee;
      setSharkFleeVelocity(fish, SHARK_FLEE_SPEED);
      if (nextFlee === 0) {
        const margin = 80;
        const stillOnScreen = fish.x > -margin
          && fish.x < CANVAS_WIDTH + margin
          && fish.y > -margin
          && fish.y < CANVAS_HEIGHT + margin;
        if (stillOnScreen) {
          fish.sharkFleeTimer = 0.25;
          continue;
        }
        // Flee time should cool down the shark, then hold before this same wounded shark re-stages.
        fish.vx = 0;
        fish.vy = 0;
        fish.age = 0;
        fish.hasAttacked = false;
        fish.sharkAttackPhase = undefined;
        fish.sharkChargeTimer = 0;
        fish.sharkReattackTimer = getSharkReattackWait(rng);
      }
      continue;
    }
    if ((fish.sharkReattackTimer ?? 0) > 0) {
      const nextWait = Math.max(0, (fish.sharkReattackTimer ?? 0) - dt);
      fish.sharkReattackTimer = nextWait;
      fish.vx = 0;
      fish.vy = 0;
      if (nextWait === 0) {
        fish.age = SHARK_AGGRO_DELAY;
        fish.hasAttacked = false;
      }
      continue;
    }
    if (fish.hasAttacked) continue;
    if (fish.age < SHARK_AGGRO_DELAY) continue;
    triggerTutorialHint(state, 'shark');
    if (fish.sharkAttackPhase == null) {
      fish.sharkAttackPhase = 'staging';
      fish.sharkChargeTimer = 0;
    }
    if (fish.sharkAttackPhase === 'staging') {
      const staged = moveSharkTowardStagePoint(fish);
      if (staged) {
        fish.sharkAttackPhase = 'charging';
        fish.sharkChargeTimer = 0;
      }
      continue;
    }
    fish.sharkChargeTimer = (fish.sharkChargeTimer ?? 0) + dt;
    const dx = fish.x - PLAYER_X;
    const dy = fish.y - PLAYER_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      const chargeP = Math.min(1, Math.max(0, (fish.sharkChargeTimer ?? 0) / SHARK_ATTACK_GROW_SEC));
      const accel = 0.32 + 0.68 * chargeP * chargeP * chargeP;
      const chargeSpeed = SHARK_ATTACK_CHARGE_SPEED * accel;
      fish.vx = (-dx / dist) * chargeSpeed;
      fish.vy = (-dy / dist) * chargeSpeed;
    }
    if (!sharkBiteThisFrame && dist < SHARK_ATTACK_RANGE) {
      sharkBiteThisFrame = true;
      fish.persistentShark = false;
      fish.hasAttacked = true;
      fish.hitFlash = 1.0;
      fish.sharkFleeTimer = 0;
      fish.age = 0;
      fish.sharkAttackPhase = undefined;
      fish.sharkChargeTimer = 0;
      fish.vx = 0;
      fish.vy = 0;
      fish.alive = false;
      state.sharkBiteFlash = 1;
      state.sharkBiteTeethElapsed = 0;
      state.roundTimeLeft = Math.max(0, state.roundTimeLeft - SHARK_ATTACK_DAMAGE);
      state.oxygenDamageTimer = OXYGEN_DAMAGE_VFX_SEC;
      state.oxygenDamageAmount = SHARK_ATTACK_DAMAGE;
      state.shakeIntensity += 5.5;
      emitHitParticles(state.particles, fish.x, fish.y, fish.type, rng);
      triggerTutorialHint(state, 'oxygenDamage');
      state.floatingTexts.push({
        x: fish.x, y: fish.y - 28,
        vy: -52, text: `-${SHARK_ATTACK_DAMAGE}s O2`, life: 1.1, maxLife: 1.1,
      });
    }
  }
  }

  const delivered = updateSpears(state.spears, state.player, dt, getReelSpeed(state.upgrades));

  const hits = detectSpearFishCollisions(state.spears, state.fish);
  const resolvedSpearIds = new Set<number>();
  const resolvedFishIds = new Set<number>();

  for (const { spearId, fishId } of hits) {
    if (resolvedSpearIds.has(spearId) || resolvedFishIds.has(fishId)) continue;

    const spear = state.spears.find((current) => current.id === spearId);
    const fish = state.fish.find((current) => current.id === fishId);
    if (!spear || !fish || !fish.alive) continue;

    if (fish.type === FishType.Large) {
      resolvedSpearIds.add(spearId);
      triggerTutorialHint(state, 'shark');
      const sharkMaxHp = getSharkHitsToKill(state.upgrades.speargun);
      const prev = fish.hitPoints ?? sharkMaxHp;
      const next = Math.max(0, prev - 1);
      fish.hitPoints = next;
      fish.hitFlash = 1.0;

      if (next > 0) {
        fish.persistentShark = true;
        fish.sharkFleeTimer = SHARK_HIT_FLEE_SEC;
        fish.sharkReattackTimer = 0;
        fish.age = 0;
        fish.sharkAttackPhase = undefined;
        fish.sharkChargeTimer = 0;
        setSharkFleeVelocity(fish, SHARK_FLEE_SPEED);
        emitHitParticles(state.particles, fish.x, fish.y, fish.type, rng, 0.65);
        returnSpearWithoutCatch(spear);
        state.floatingTexts.push({
          x: fish.x,
          y: fish.y - 34,
          vy: -52,
          text: `SHARK ${sharkMaxHp - next}/${sharkMaxHp}`,
          life: 0.85,
          maxLife: 0.85,
          textScale: 1.08,
        });
        state.shakeIntensity += 2.6;
        continue;
      }

      resolvedFishIds.add(fishId);
      fish.persistentShark = false;
      fish.alive = false;
      const catchValue = Math.floor(
        getFishValue(fish.type, state.sessionTime, getValueMultiplier(state.upgrades), rng)
        * getHaulMultiplier(state.upgrades),
      );
      attachCatchToSpear(spear, fish.type, catchValue, fish.ftueShowcase === true);
      emitHookImpactFX(state.particles, fish.x, fish.y, fish.type, rng);
      state.shakeIntensity += SHAKE_ON_HOOK * 1.35;
      state.pendingEvents.push({
        type: 'fishHooked',
        x: fish.x,
        y: fish.y,
        fishType: fish.type,
      });
      continue;
    }

    if (fish.type === FishType.Boss) {
      const dmg = getBossSpearDamage(state.upgrades.speargun);
      resolvedSpearIds.add(spearId);
      fish.hitFlash = 1.0;
      if (dmg <= 0) {
        emitHitParticles(state.particles, fish.x, fish.y, fish.type, rng, 0.4);
        returnSpearWithoutCatch(spear);
        state.floatingTexts.push({
          x: fish.x,
          y: fish.y - 40,
          vy: -50,
          text: 'UPGRADE SPEAR (LV2+)',
          life: 0.9,
          maxLife: 0.9,
        });
        state.shakeIntensity += 1.2;
        continue;
      }
      const prev = fish.hitPoints ?? BOSS_FISH_MAX_HP;
      const next = Math.max(0, prev - dmg);
      fish.hitPoints = next;
      if (next > 0) {
        emitHitParticles(state.particles, fish.x, fish.y, fish.type, rng, 0.55);
        returnSpearWithoutCatch(spear);
        state.floatingTexts.push({
          x: fish.x,
          y: fish.y - 32,
          vy: -46,
          text: `-${dmg}  (${next} left)`,
          life: 0.75,
          maxLife: 0.75,
        });
        state.shakeIntensity += 2.0;
        continue;
      }
      resolvedFishIds.add(fishId);
      fish.alive = false;
      const catchValue = Math.floor(
        getFishValue(fish.type, state.sessionTime, getValueMultiplier(state.upgrades), rng)
        * getHaulMultiplier(state.upgrades),
      );
      attachCatchToSpear(spear, fish.type, catchValue);
      emitHookImpactFX(state.particles, fish.x, fish.y, fish.type, rng);
      state.shakeIntensity += SHAKE_ON_HOOK * 1.2;
      state.pendingEvents.push({
        type: 'fishHooked',
        x: fish.x,
        y: fish.y,
        fishType: fish.type,
      });
      continue;
    }

    resolvedSpearIds.add(spearId);
    resolvedFishIds.add(fishId);

    fish.alive = false;
    applyFtueShowcaseFleeAfterFirstCatch(state.fish, fish);
    const catchValue = fish.fixedCatchValue ?? Math.floor(
      getFishValue(fish.type, state.sessionTime, getValueMultiplier(state.upgrades), rng)
      * getHaulMultiplier(state.upgrades),
    );
    attachCatchToSpear(spear, fish.type, catchValue, fish.ftueShowcase === true);
    emitHookImpactFX(state.particles, fish.x, fish.y, fish.type, rng);
    state.shakeIntensity += SHAKE_ON_HOOK;
    state.pendingEvents.push({
      type: 'fishHooked',
      x: fish.x,
      y: fish.y,
      fishType: fish.type,
    });
  }

  for (const catchResult of delivered) {
    state.comboCount = state.comboTimer > 0 ? state.comboCount + 1 : 1;
    state.comboTimer = 1.8;

    const comboBonus = state.comboCount > 1
      ? Math.floor(catchResult.value * 0.22 * (state.comboCount - 1))
      : 0;
    const totalReward = catchResult.value + comboBonus;

    if (catchResult.fishType === FishType.Treasure) {
      const isFtueFirstTreasure = state.ftue.stage === 'firstTreasureCatch';
      state.treasureReveal = {
        elapsed: 0,
        opened: false,
        awarded: false,
        value: totalReward,
        x: catchResult.x,
        y: catchResult.y,
        comboBonus,
        totalComboForLine: state.comboCount,
        durationSec: TREASURE_REVEAL_DURATION_SEC,
        awardAtSec: TREASURE_REVEAL_AWARD_AT_SEC,
      };
      if (isFtueFirstTreasure) {
        state.ftue.stage = 'treasureUpgrade';
        state.ftue.prompt = null;
        state.fishSpawnTimer = 0.1;
        state.treasureSpawnTimer = TREASURE_SPAWN_INTERVAL;
        state.bossSpawnTimer = BOSS_SPAWN_FIRST_DELAY;
      }
      continue;
    }

    state.money += totalReward;
    state.sessionEarnings += totalReward;
    state.sessionCatchCount += 1;
    triggerTutorialHint(state, 'catchBasics');

    // Pufferfish: add time + celebration flash
    if (catchResult.fishType === FishType.Puffer) {
      state.roundTimeLeft = Math.min(state.roundTimeMax, state.roundTimeLeft + PUFFER_TIME_BONUS);
      state.oxyBoostTimer = 1.8;
    }
    if (
      catchResult.fishType === FishType.Puffer
      && catchResult.ftueShowcase
      && state.ftue.oxygenLessonFishId != null
    ) {
      state.ftue.oxygenLessonFishId = null;
      state.ftue.prompt = null;
      state.ftue.oxygenLessonTimer = 0;
    }

    emitCatchPayoffFX(state.particles, catchResult.x, catchResult.y, catchResult.fishType, totalReward, rng);
    spawnCatchCoinBurst(state, catchResult.x, catchResult.y - 8, totalReward);
    emitFloatingText(
      state.floatingTexts,
      catchResult.x,
      catchResult.y - 26,
      totalReward,
      { pop: true, tier: moneyTextTier(totalReward) },
    );
    state.catchFlash = Math.max(
      state.catchFlash,
      Math.min(CATCH_FLASH_CAP, 0.04 + Math.min(0.15, totalReward / 400 * 0.095)),
    );
    if (comboBonus > 0) {
      triggerTutorialHint(state, 'combo');
      state.floatingTexts.push({
        x: catchResult.x,
        y: catchResult.y - 52,
        vy: -64,
        text: `x${state.comboCount} COMBO`,
        life: 0.8,
        maxLife: 0.8,
        textScale: 1.22,
      });
    }
    const comboShakeScale = state.comboCount > 1 ? SHAKE_COMBO_SCALE : 1;
    state.shakeIntensity += SHAKE_ON_CATCH * comboShakeScale;
    state.pendingEvents.push({
      type: 'fishCaught',
      x: catchResult.x,
      y: catchResult.y,
      value: totalReward,
      fishType: catchResult.fishType,
    });
    if (state.ftue.stage === 'firstFishCatch' && catchResult.ftueShowcase) {
      state.ftue.stage = 'firstFishCaught';
      state.ftue.prompt = null;
      state.ftue.fishLessonCatchWaitTimer = 0;
      state.comboCount = 0;
      state.comboTimer = 0;
      state.fishSpawnTimer = 0.1;
      state.treasureSpawnTimer = 8_000_000_000_000;
      state.bossSpawnTimer = BOSS_SPAWN_FIRST_DELAY;
      continue;
    }
    if (state.ftue.stage === 'sharkEncounter' && catchResult.fishType === FishType.Large) {
      state.ftue.stage = 'firstFishIntro';
      state.ftue.prompt = null;
      state.ftueActive = false;
      state.comboCount = 0;
      state.comboTimer = 0;
      state.ftue.fishLessonTimer = 0;
      state.fishSpawnTimer = 0.1;
      state.treasureSpawnTimer = 8_000_000_000_000;
      state.bossSpawnTimer = 8_000_000_000_000;
    }
  }

  state.fish = removeDespawnedFish(state.fish);

  // Apply miss reload before spears are removed
  const hasMiss = state.spears.some((s) => s.done && s.caughtFishType === null);
  if (hasMiss) {
    const base = getShootCooldown(state.upgrades);
    const inCombo = state.comboTimer > 0 && state.comboCount > 1;
    state.player.shootCooldown = inCombo ? base * 0.22 : base;
  }

  state.spears = removeResolvedSpears(state.spears);
  state.particles = updateParticles(state.particles, dt);
  state.floatingTexts = updateFloatingTexts(state.floatingTexts, dt);

  state.shakeIntensity = Math.max(0, state.shakeIntensity - SHAKE_DECAY * dt);
  state.shakeX = state.shakeIntensity > 0 ? (rng.next() - 0.5) * state.shakeIntensity : 0;
  state.shakeY = state.shakeIntensity > 0 ? (rng.next() - 0.5) * state.shakeIntensity : 0;

  if (state.roundTimeLeft <= 0) {
    beginBreaching(state);
  }
  return ACTION_RUNNING;
}

export function update(state: FullGameState, dt: number, commands: GameInputCommand[]): void {
  let advanceActionVfx = true;
  switch (state.phase) {
    case GamePhase.Boat:
      updateBoat(state, commands);
      break;
    case GamePhase.Diving:
      updateDiving(state, dt);
      break;
    case GamePhase.Breaching:
      updateBreaching(state, dt, commands);
      break;
    case GamePhase.Action:
      advanceActionVfx = updateAction(state, dt, commands).advanceActionVfx;
      break;
  }

  updateTutorialHintTimer(state, dt);
  updateCatchCoinBursts(state, dt);
  state.upgradeBackHighlightTimer = Math.max(0, state.upgradeBackHighlightTimer - dt);

  if ((state.phase === GamePhase.Action && advanceActionVfx) || state.phase === GamePhase.Breaching) {
    updateNetVfx(state, dt, getGameRng());
    if (state.harpoonGunAnimElapsed >= 0) {
      state.harpoonGunAnimElapsed += dt;
      if (state.harpoonGunAnimElapsed >= HARPOON_GUN_ANIM_TOTAL_SEC) {
        state.harpoonGunAnimElapsed = -1;
      }
    }
  }

  if (state.sharkBiteTeethElapsed >= 0) {
    state.sharkBiteTeethElapsed += dt;
    if (state.sharkBiteTeethElapsed >= SHARK_BITE_VFX_TOTAL_SEC) {
      state.sharkBiteTeethElapsed = -1;
    }
  }
}

function buildFishRenderState(state: FullGameState): RenderState['fish'] {
  const fishRenderState: RenderState['fish'] = [];
  for (const current of state.fish) {
    if (!current.alive && current.hitFlash <= 0) continue;

    // Tilt sprite in the direction of travel (clamped to ±35°)
    const maxTilt = Math.PI * 0.19;
    const rawTilt = Math.atan2(current.vy, Math.abs(current.vx) + 0.01);
    // Sinusoidal tail-wag — each fish offset by id so they don't sync
    const wobble = current.type === FishType.Jelly ? 0
      : Math.sin(state.sessionTime * 7.5 + current.id * 2.1) * 0.09;
    const rotation = current.type === FishType.Jelly ? 0
      : Math.max(-maxTilt, Math.min(maxTilt, rawTilt + wobble));
    const isAggressive = current.type === FishType.Large
      && current.alive
      && current.age >= SHARK_AGGRO_DELAY
      && !current.hasAttacked
      && (current.sharkFleeTimer ?? 0) <= 0
      && current.sharkAttackPhase === 'charging';
    const attackProgress = isAggressive
      ? Math.min(1, (current.sharkChargeTimer ?? 0) / SHARK_ATTACK_GROW_SEC)
      : 0;
    const sharkMaxHp = current.type === FishType.Large
      ? state.ftue.stage === 'sharkEncounter'
        ? 1
        : getSharkHitsToKill(state.upgrades.speargun)
      : undefined;
    const sharkHp = current.type === FishType.Large ? (current.hitPoints ?? sharkMaxHp) : undefined;
    let drawScale = current.drawScale ?? 1;
    if (
      current.type === FishType.Large
      && current.alive
      && state.ftue.stage === 'sharkEncounter'
      && state.ftue.prompt === 'tapFightBack'
      && state.ftueActive
    ) {
      drawScale *= getFtueSharkPulseScaleFactor(state.ftue.sharkFtuePulseT);
    }
    fishRenderState.push({
      x: current.x,
      y: current.y,
      type: current.type,
      drawScale,
      hitFlash: current.hitFlash,
      facingLeft: current.vx > 0,  // sprites face LEFT natively — flip when moving right
      rotation,
      isAggressive,
      attackProgress,
      isFleeing: current.type === FishType.Large && (current.sharkFleeTimer ?? 0) > 0,
      hitPoints: sharkHp,
      maxHitPoints: sharkMaxHp,
    });
  }
  return fishRenderState;
}

/**
 * Suppress spear/combo/+O₂ HUD stripes whenever sim time is frozen for FTUE or treasure reveal,
 * matching the `ACTION_PAUSED` branches and gated blocks in {@link update}.
 */
function shouldSuppressGameplayHudMessages(state: FullGameState): boolean {
  if (state.phase !== GamePhase.Action) return false;
  if (state.treasureReveal != null) return true;

  const { ftue } = state;
  if (state.ftueActive && ftue.stage === 'sharkEncounter') return true;
  if (ftue.stage === 'firstFishCatch') return true;
  if (ftue.stage === 'firstTreasureIntro') return true;
  if (ftue.stage === 'firstTreasureCatch') return true;
  if (ftue.oxygenLessonFishId != null) return true;
  if (
    ftue.stage === 'secondDiveConsumables'
    && (ftue.prompt === 'useBait' || ftue.prompt === 'useNet')
  ) {
    return true;
  }
  return false;
}

export function getRenderState(state: FullGameState): RenderState {
  const hasSpear = state.spears.length > 0;
  const carryingFish = state.spears.some((spear) => spear.caughtFishType !== null);
  const harpoonStatus = hasSpear
    ? (carryingFish ? 'HAUL' : 'REEL')
    : (state.player.shootCooldown <= 0 ? 'READY' : 'LOAD');

  const ftue = state.ftueActive;
  const trPay = state.treasureReveal;
  let hudMoneyDisplay = state.money;
  if (
    trPay?.awarded
    && trPay.moneyLerpFrom != null
    && trPay.moneyLerpTo != null
  ) {
    const tSince = trPay.elapsed - trPay.awardAtSec;
    const u = Math.min(1, Math.max(0, tSince / TREASURE_MONEY_LERP_SEC));
    const s = u * u * (3 - 2 * u);
    hudMoneyDisplay = Math.round(trPay.moneyLerpFrom + (trPay.moneyLerpTo - trPay.moneyLerpFrom) * s);
  }

  return {
    phase: state.phase,
    musicMuted: state.musicMuted,
    ftueActive: ftue,
    ftueStage: state.ftue.stage,
    ftuePrompt: state.ftue.prompt,
    shakeX: state.shakeX,
    shakeY: state.shakeY,
    player: {
      x: state.player.x,
      y: state.player.y,
      aimAngle: state.player.aimAngle,
    },
    spears: state.spears.map((spear) => {
      let carryingFishScale = REELED_FISH_SCALE_START;
      if (spear.caughtFishType !== null) {
        const anchor = getHarpoonMuzzleWorldFromGrip(
          state.player.x,
          state.player.y,
          state.player.aimAngle,
        );
        const dist = Math.hypot(anchor.x - spear.x, anchor.y - spear.y);
        const startDist = Math.max(1, spear.caughtFishStartDistance);
        const progress = Math.min(1, Math.max(0, 1 - dist / startDist));
        const smooth = progress * progress * (3 - 2 * progress);
        carryingFishScale = REELED_FISH_SCALE_START + (REELED_FISH_SCALE_END - REELED_FISH_SCALE_START) * smooth;
      }
      return {
        x: spear.x,
        y: spear.y,
        angle: spear.fireAngle,   // never flips on return
        carryingFishType: spear.caughtFishType,
        carryingFishScale,
        carryingFtueShowcase: spear.caughtFishWasFtueShowcase,
      };
    }),
    fish: buildFishRenderState(state),
    ftueHandTarget: (() => {
      if (
        state.ftue.prompt !== 'tapFightBack'
        && state.ftue.prompt !== 'catchFish'
        && state.ftue.prompt !== 'treasureIntro'
        && state.ftue.prompt !== 'catchTreasure'
        && state.ftue.prompt !== 'oxygenLimit'
      ) return null;
      const target = state.ftue.prompt === 'tapFightBack'
        ? state.fish.find((fish) => fish.alive && fish.type === FishType.Large)
        : state.ftue.prompt === 'catchFish'
          ? state.fish.find((fish) => fish.alive && fish.ftueShowcase)
            ?? state.spears.find((spear) => spear.caughtFishWasFtueShowcase)
          : state.ftue.prompt === 'oxygenLimit' && state.ftue.oxygenLessonFishId != null
            ? state.fish.find((fish) => fish.id === state.ftue.oxygenLessonFishId && fish.alive)
              ?? state.spears.find((spear) => spear.caughtFishWasFtueShowcase)
          : state.fish.find((fish) => fish.alive && fish.type === FishType.Treasure);
      return target == null ? null : { x: target.x, y: target.y };
    })(),
    ftueTreasureZoom: state.ftue.prompt === 'treasureIntro'
      ? getFtueTreasureZoom(state.ftue.treasureIntroTimer)
      : state.ftue.prompt === 'catchFish'
        ? getFtueFishLessonZoom(state.ftue.fishLessonTimer)
        : 1,
    ftueTreasureFocusBlend: state.ftue.prompt === 'treasureIntro'
      ? getFtueTreasureFocusBlend(state.ftue.treasureIntroTimer)
      : state.ftue.prompt === 'catchFish'
        ? getFtueFishLessonFocusBlend(state.ftue.fishLessonTimer)
        : 0,
    ftueConsumableZoom: state.ftue.prompt === 'useBait' || state.ftue.prompt === 'useNet'
      ? getFtueConsumableZoom(state.ftue.consumableLessonTimer)
      : 1,
    particles: [...state.particles],
    floatingTexts: [...state.floatingTexts],
    catchCoinBursts: state.catchCoinBursts.map((burst) => ({ ...burst })),
    money: state.money,
    hudMoneyDisplay,
    timeLeftFraction: ftue
      ? 1
      : state.roundTimeMax > 0
        ? state.roundTimeLeft / state.roundTimeMax
        : 0,
    roundTimeLeft: ftue ? state.roundTimeMax : state.roundTimeLeft,
    roundTimeMax: state.roundTimeMax,
    timeElapsed: ftue ? 0 : state.sessionTime,
    actionSessionTime:
      state.phase === GamePhase.Action || state.phase === GamePhase.Breaching ? state.sessionTime : 0,
    sessionEarnings: state.sessionEarnings,
    sessionCatchCount: state.sessionCatchCount,
    harpoonStatus,
    suppressGameplayHudMessages: shouldSuppressGameplayHudMessages(state),
    reloadFraction: state.player.shootCooldown > 0
      ? 1 - Math.min(1, state.player.shootCooldown / getShootCooldown(state.upgrades))
      : 1,
    comboCount: state.comboCount,
    comboActive: state.comboTimer > 0 && state.comboCount > 1,
    oxyBoostActive: state.oxyBoostTimer > 0,
    oxygenDamageTimer: state.oxygenDamageTimer,
    oxygenDamageAmount: state.oxygenDamageAmount,
    tutorialHint: state.tutorial.activeId == null
      ? null
      : {
        id: state.tutorial.activeId,
        ...TUTORIAL_HINT_COPY[state.tutorial.activeId],
      },
    upgradePanelOpen: state.upgradePanelOpen,
    boatLeaderboardOpen: state.boatLeaderboardOpen,
    upgrades: { ...state.upgrades },
    upgradeCosts: getAllUpgradeCosts(state.upgrades),
    canAfford: getCanAffordAll(state.money, state.upgrades),
    consumables: { ...state.consumables },
    canAffordConsumables: {
      net:  state.money >= NET_COST  && state.consumables.net  < NET_MAX_STOCK,
      bait: state.money >= BAIT_COST && state.consumables.bait < BAIT_MAX_STOCK,
    },
    baitActive: state.baitActive,
    baitX: state.baitX,
    baitY: state.baitY,
    baitFraction: state.baitActive ? state.baitTimer / BAIT_DURATION : 0,
    diveTransition: buildDiveTransitionDraw(state),
    lastRunEarnings: state.lastRunEarnings,
    lastRunDurationSec: state.lastRunDurationSec,
    lastRunCatchCount: state.lastRunCatchCount,
    leaderboard: state.leaderboard,
    upgradeBackHighlight: state.upgradeBackHighlightTimer > 0,
    catchFlash: state.catchFlash,
    sharkBiteFlash: state.sharkBiteFlash,
    sharkBiteTeethElapsed: state.sharkBiteTeethElapsed,
    netVfx: state.netVfx != null ? { elapsed: state.netVfx.elapsed } : null,
    harpoonGunAnimElapsed: state.harpoonGunAnimElapsed,
    hudConsumableFlash: { ...state.hudConsumableFlash },
    treasureCinematic: (() => {
      const tr = state.treasureReveal;
      if (tr == null) return undefined;
      const p = Math.min(1, tr.elapsed / tr.durationSec);
      const el = tr.elapsed;
      const peak = TREASURE_REVEAL_WHITE_PEAK_SEC;
      const fade = TREASURE_REVEAL_WHITE_FADE_SEC;
      let revealWhiteAlpha = 0;
      if (el < peak) {
        revealWhiteAlpha = peak > 0 ? el / peak : 0;
      } else if (el < peak + fade) {
        const u = (el - peak) / (fade > 0 ? fade : 1e-6);
        revealWhiteAlpha = Math.max(0, 1 - u);
      } else {
        revealWhiteAlpha = 0;
      }
      const zoom = getActionViewZoomForSession(state.sessionTime, state.ftueActive);
      const raw = actionWorldToCanvas(
        tr.x,
        tr.y,
        state.shakeX,
        state.shakeY,
        state.player.x,
        state.player.y,
        zoom,
      );
      const pad = 48;
      const chestScreenX = Math.min(CANVAS_WIDTH - pad, Math.max(pad, raw.x));
      const chestScreenY = Math.min(CANVAS_HEIGHT - pad, Math.max(pad, raw.y));
      const elapsedSinceAward = tr.awarded ? tr.elapsed - tr.awardAtSec : 0;
      const coinCount = Math.min(
        42,
        Math.max(24, 14 + Math.floor(Math.log2(tr.value + 8)) * 3),
      );
      return {
        progress: p,
        revealWhiteAlpha: revealWhiteAlpha * 0.55,
        opened: tr.opened,
        chestScreenX,
        chestScreenY,
        chestScale:
          0.9
          + Math.min(1, tr.elapsed / 0.4) * 0.1
          + (tr.opened ? 0.08 : 0),
        /** Subtle wobble only; halos removed from overlay. */
        shake: tr.opened
          ? Math.max(
            0,
            1
              - (tr.elapsed - tr.awardAtSec)
                / Math.max(0.001, tr.durationSec - tr.awardAtSec),
          ) * 0.04
          : (1 - Math.min(1, tr.elapsed / tr.awardAtSec)) * 0.08,
        prizeText: `+$${tr.value}`,
        comboText: tr.awarded && tr.comboBonus > 0
          ? `x${tr.totalComboForLine} COMBO`
          : undefined,
        treasureValue: tr.value,
        elapsedSinceAward,
        coinCount,
      };
    })(),
  };
}

export function drainEvents(state: FullGameState): FullGameState['pendingEvents'] {
  return state.pendingEvents.splice(0);
}
