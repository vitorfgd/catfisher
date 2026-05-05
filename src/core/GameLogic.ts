// @GUARD: Core game state machine. No DOM, canvas, MHS, or audio calls.
// All platform side-effects are triggered via pendingEvents (drained by BrowserGameLoop).

import {
  FishType,
  GamePhase,
  type ConsumableState,
  type FullGameState,
  type UpgradeState,
} from './Types';
export type { GameEvent } from './Types';

import type { GameInputCommand } from '../shared/InputCommands';
import type { OceanTransitionDraw } from '../render/oceanTransition';
import type { RenderState } from '../render/RenderState';

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
  OCEAN_BUBBLE_FADE_IN_SEC,
  OCEAN_BUBBLE_RISE_SPEED,
  OCEAN_BREACH_TOTAL_SEC,
  OCEAN_DIVE_TOTAL_SEC,
  OCEAN_TRANSITION_BREACH_BOAT_REVEAL_SEC,
  OCEAN_TRANSITION_BUBBLE_COUNT,
  OCEAN_TRANSITION_BUBBLE_SPAWN_AT_MOVE,
  OCEAN_TRANSITION_FADE_SEC,
  OCEAN_TRANSITION_MOVE_SEC,
  OCEAN_TRANSITION_PREFACE_BEFORE_RISE_SEC,
  OCEAN_SURFACE_DRAW_H,
  OCEAN_SURFACE_NATURAL_H,
  OCEAN_SURFACE_NATURAL_W,
  TREASURE_REVEAL_AWARD_AT_SEC,
  TREASURE_REVEAL_DURATION_SEC,
  TREASURE_MONEY_LERP_SEC,
  TREASURE_REVEAL_WHITE_FADE_SEC,
  TREASURE_REVEAL_WHITE_PEAK_SEC,
  NET_COST,
  NET_MAX_STOCK,
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
  SHARK_BITE_FLASH_DECAY,
  SHARK_BITE_VFX_TOTAL_SEC,
  SHARK_MAX_ALIVE,
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
  getTurretMuzzleWorld,
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

const FTUE_SHOWCASE_FISH_SCALE = 1.58;

function decayHudConsumableFlash(state: FullGameState, dt: number): void {
  state.hudConsumableFlash.net = Math.max(0, state.hudConsumableFlash.net - dt);
  state.hudConsumableFlash.bait = Math.max(0, state.hudConsumableFlash.bait - dt);
}

function smooth01(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}

function easeOutCubic(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return 1 - (1 - u) ** 3;
}

function oceanSurfaceLayout(): { surfaceDrawH: number; surfaceDrawW: number; scrollRange: number } {
  const surfaceDrawH = OCEAN_SURFACE_DRAW_H;
  const surfaceDrawW = (OCEAN_SURFACE_NATURAL_W / OCEAN_SURFACE_NATURAL_H) * surfaceDrawH;
  return { surfaceDrawH, surfaceDrawW, scrollRange: Math.max(0, surfaceDrawW - CANVAS_WIDTH) };
}

function diveParentYEndpoints(): { yStart: number; yEnd: number } {
  const { surfaceDrawH } = oceanSurfaceLayout();
  return {
    yStart: CANVAS_HEIGHT + surfaceDrawH + 24,
    yEnd: -surfaceDrawH - 28,
  };
}

function spawnOceanBubbles(state: FullGameState, rng: Rng): void {
  state.oceanBubblesSpawned = true;
  const { surfaceDrawH } = oceanSurfaceLayout();
  for (let i = 0; i < OCEAN_TRANSITION_BUBBLE_COUNT; i += 1) {
    state.oceanBubbles.push({
      lx: rng.between(24, CANVAS_WIDTH - 24),
      ly: rng.between(surfaceDrawH + 36, Math.min(CANVAS_HEIGHT * 0.96, CANVAS_HEIGHT - 40)),
      variant: Math.floor(rng.next() * 7),
      age: 0,
    });
  }
}

function updateOceanBubblesCore(state: FullGameState, dt: number): void {
  for (const b of state.oceanBubbles) {
    b.age += dt;
    b.ly -= OCEAN_BUBBLE_RISE_SPEED * dt;
  }
  state.oceanBubbles = state.oceanBubbles.filter((b) => b.ly > -160);
}

/**
 * Cluster above the bottom-fixed turret; [0] = hand + tap target.
 * Kept low enough for the starting spear range to reach every showcase fish.
 */
const FTUE_SHOWCASE_FISH: ReadonlyArray<{ x: number; y: number; type: FishType }> = [
  { x: PLAYER_X - 96, y: Math.round((432 * CANVAS_HEIGHT) / 854), type: FishType.Small },
  { x: PLAYER_X + 108, y: Math.round((434 * CANVAS_HEIGHT) / 854), type: FishType.Small },
  { x: PLAYER_X - 4, y: Math.round((362 * CANVAS_HEIGHT) / 854), type: FishType.Medium },
];

/**
 * Insta-hook FTUE: jump straight to Action, frozen fish, timer paused until first tap.
 * Caller should only run when local / platform says first visit.
 */
export function bootstrapActionFtueDive(state: FullGameState): void {
  state.ftueActive = true;
  state.phase = GamePhase.Action;
  state.diveTimer = 0;
  resetForNewDive(state);
  state.fish = [];
  let id = state.nextFishId;
  for (const row of FTUE_SHOWCASE_FISH) {
    state.fish.push({
      id: id++,
      x: row.x,
      y: row.y,
      vx: 0,
      vy: 0,
      wanderTimer: 9999,
      age: 0,
      hasAttacked: false,
      type: row.type,
      drawScale: FTUE_SHOWCASE_FISH_SCALE,
      ftueShowcase: true,
      alive: true,
      hitFlash: 0,
    });
  }
  state.nextFishId = id;
  state.fishSpawnTimer = 8_000_000_000_000;
  state.treasureSpawnTimer = 8_000_000_000_000;
  state.bossSpawnTimer = 8_000_000_000_000;
  state.pendingEvents.push({ type: 'diveStarted' });
}

function exitFtueDiveState(state: FullGameState): void {
  if (!state.ftueActive) return;
  const rng = getGameRng();
  state.ftueActive = false;
  state.fishSpawnTimer = 0.1;
  state.treasureSpawnTimer = TREASURE_SPAWN_INTERVAL;
  state.bossSpawnTimer = BOSS_SPAWN_FIRST_DELAY;
  for (const f of state.fish) {
    if (!f.alive) continue;
    const dir = rng.next() < 0.5 ? 1 : -1;
    f.vx = dir * rng.between(22, 40);
    f.vy = rng.between(-18, 18);
    f.wanderTimer = rng.between(3.2, 5.5);
  }
  state.pendingEvents.push({ type: 'ftueDiveExited' });
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
    player: { x: PLAYER_X, y: PLAYER_Y, aimAngle: -Math.PI / 2, shootCooldown: 0 },
    spears: [],
    fish: [],
    particles: [],
    floatingTexts: [],
    roundTimeLeft: 0,
    roundTimeMax: getMaxOxygen(upgrades),
    sessionEarnings: 0,
    sessionCatchCount: 0,
    sessionTime: 0,
    comboCount: 0,
    comboTimer: 0,
    oxyBoostTimer: 0,
    upgradePanelOpen: null,
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
    diveTimer: 0,
    breachTimer: 0,
    oceanBubbles: [],
    oceanBubblesSpawned: false,
    pendingEvents: [],
    hudConsumableFlash: { net: 0, bait: 0 },
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
  state.treasureReveal = null;
  state.hudConsumableFlash = { net: 0, bait: 0 };
}

function beginBreaching(state: FullGameState): void {
  state.roundTimeLeft = 0;
  state.phase = GamePhase.Breaching;
  state.breachTimer = 0;
  state.oceanBubbles = [];
  state.oceanBubblesSpawned = false;
}

function finalizeRunToBoat(state: FullGameState): void {
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
  state.shakeIntensity = 0;
  state.shakeX = 0;
  state.shakeY = 0;
  state.catchFlash = 0;
  state.sharkBiteFlash = 0;
  state.sharkBiteTeethElapsed = -1;
  state.treasureReveal = null;
  state.hudConsumableFlash = { net: 0, bait: 0 };
  state.pendingEvents.push({
    type: 'runEnded',
    earnings: state.sessionEarnings,
    runDurationSec: state.lastRunDurationSec,
  });
}

function updateBoat(state: FullGameState, commands: GameInputCommand[]): void {
  for (const command of commands) {
    if (command.type === 'divePress') {
      state.upgradePanelOpen = null;
      state.phase = GamePhase.Diving;
      state.diveTimer = 0;
      state.oceanBubbles = [];
      state.oceanBubblesSpawned = false;
      resetForNewDive(state);
      state.pendingEvents.push({ type: 'diveStarted' });
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
      state.pendingEvents.push({ type: 'upgradeBought', id });
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
  const rng = getGameRng();
  state.diveTimer += dt;
  const t = state.diveTimer;
  const P = OCEAN_TRANSITION_PREFACE_BEFORE_RISE_SEC;
  const MOVE = OCEAN_TRANSITION_MOVE_SEC;

  if (t >= P + MOVE * OCEAN_TRANSITION_BUBBLE_SPAWN_AT_MOVE && !state.oceanBubblesSpawned) {
    spawnOceanBubbles(state, rng);
  }
  updateOceanBubblesCore(state, dt);

  if (t >= OCEAN_DIVE_TOTAL_SEC) {
    state.diveTimer = OCEAN_DIVE_TOTAL_SEC;
    state.phase = GamePhase.Action;
    state.oceanBubbles = [];
  }
}

function updateBreaching(state: FullGameState, dt: number): void {
  const rng = getGameRng();
  state.breachTimer += dt;
  const t = state.breachTimer;
  const MOVE = OCEAN_TRANSITION_MOVE_SEC;
  const FADE = OCEAN_TRANSITION_FADE_SEC;
  const moveElapsed = t - FADE;

  if (
    moveElapsed >= MOVE * OCEAN_TRANSITION_BUBBLE_SPAWN_AT_MOVE
    && !state.oceanBubblesSpawned
    && moveElapsed > 0
  ) {
    spawnOceanBubbles(state, rng);
  }
  updateOceanBubblesCore(state, dt);

  if (t >= OCEAN_BREACH_TOTAL_SEC) {
    state.breachTimer = OCEAN_BREACH_TOTAL_SEC;
    state.oceanBubbles = [];
    finalizeRunToBoat(state);
  }
}

function updateAction(state: FullGameState, dt: number, commands: GameInputCommand[]): void {
  const rng = getGameRng();
  decayHudConsumableFlash(state, dt);
  if (state.catchFlash > 0) {
    state.catchFlash = Math.max(0, state.catchFlash - CATCH_FLASH_DECAY * dt);
  }
  if (state.sharkBiteFlash > 0) {
    state.sharkBiteFlash = Math.max(0, state.sharkBiteFlash - SHARK_BITE_FLASH_DECAY * dt);
  }

  if (state.ftueActive) {
    for (const c of commands) {
      if (c.type === 'useConsumable') {
        return;
      }
    }
  }

  if (state.ftueActive) {
    for (const c of commands) {
      if (c.type === 'tap') {
        exitFtueDiveState(state);
        break;
      }
    }
    if (state.ftueActive) {
      return;
    }
  }

  if (state.treasureReveal) {
    updateTreasureReveal(state, dt, rng);
    if (state.treasureReveal) {
      return;
    }
  }

  const canShoot = state.player.shootCooldown <= 0 && state.spears.length === 0;

  for (const command of commands) {
    // Consumable use
    if (command.type === 'useConsumable') {
      if (command.id === 'net' && state.consumables.net > 0) {
        state.consumables.net -= 1;
        // Net: instantly catch normal fish; rock boss takes heavy damage instead
        for (const fish of state.fish) {
          if (!fish.alive) continue;
          if (fish.type === FishType.Boss) {
            if (state.upgrades.speargun < BOSS_MIN_SPEAR_LEVEL_TO_DAMAGE) {
              // Need at least level-2 speargun to harm boss armor (same rule as spear)
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
          emitFloatingText(state.floatingTexts, fish.x, fish.y - 20, value, { pop: value >= 35, tier: moneyTextTier(value) });
        }
        state.shakeIntensity += 4.0;
        state.hudConsumableFlash.net = 0.34;
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
          const liveN = state.fish.filter((f) => f.alive).length;
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
      }
      continue;
    }

    if (command.type !== 'tap') continue;

    const w = canvasToActionWorld(
      command.x,
      command.y,
      state.shakeX,
      state.shakeY,
      state.player.x,
      state.player.y,
      getActionViewZoomForSession(state.sessionTime, state.ftueActive),
    );
    const muzzle = getTurretMuzzleWorld(state.player.x, state.player.y);
    const dx = w.x - muzzle.x;
    const dy = w.y - muzzle.y;
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
    state.player.shootCooldown = getShootCooldown(state.upgrades);
    state.pendingEvents.push({ type: 'spearFired' });
    break;
  }

  if (state.player.shootCooldown > 0) {
    state.player.shootCooldown = Math.max(0, state.player.shootCooldown - dt);
  }

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
      const liveNow = state.fish.filter((f) => f.alive).length;
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
        let sharksAlive = state.fish.filter((f) => f.alive && f.type === FishType.Large).length;
        for (let u = 0; u < nearN; u += 1) {
          const fish = spawnFish(state.nextFishId++, rng, state.sessionTime, {
            spawnInward: true,
            avoidShark: sharksAlive >= SHARK_MAX_ALIVE,
          });
          if (fish.type === FishType.Large) sharksAlive += 1;
          state.fish.push(fish);
        }
        for (let v = 0; v < n - nearN; v += 1) {
          const fish = spawnFish(state.nextFishId++, rng, state.sessionTime, {
            spawnInward: false,
            avoidShark: sharksAlive >= SHARK_MAX_ALIVE,
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
    const liveFish = state.fish.filter((f) => f.alive).length;
    if (liveFish < FISH_SPAWN_MAX_ALIVE) {
      const sharksAlive = state.fish.filter((f) => f.alive && f.type === FishType.Large).length;
      state.fish.push(spawnFish(state.nextFishId++, rng, state.sessionTime, {
        avoidShark: sharksAlive >= SHARK_MAX_ALIVE,
      }));
    }
    state.fishSpawnTimer = getModulatedSpawnInterval(state.sessionTime) * waveIntScale;
  }

  // Treasure fish — periodic spawn, every wave / dive
  state.treasureSpawnTimer -= dt;
  if (state.treasureSpawnTimer <= 0) {
    state.fish.push(spawnFishOfType(state.nextFishId++, rng, FishType.Treasure));
    state.treasureSpawnTimer = TREASURE_SPAWN_INTERVAL;
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
  for (const fish of state.fish) {
    if (fish.type !== FishType.Large || !fish.alive || fish.hasAttacked) continue;
    if (fish.age < SHARK_AGGRO_DELAY) continue;
    const dx = fish.x - PLAYER_X;
    const dy = fish.y - PLAYER_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      fish.vx = (-dx / dist) * SHARK_ATTACK_CHARGE_SPEED;
      fish.vy = (-dy / dist) * SHARK_ATTACK_CHARGE_SPEED;
    }
    if (!sharkBiteThisFrame && dist < SHARK_ATTACK_RANGE) {
      sharkBiteThisFrame = true;
      fish.hasAttacked = true;
      fish.hitFlash = 1.0;
      state.sharkBiteFlash = 1;
      state.sharkBiteTeethElapsed = 0;
      state.roundTimeLeft = Math.max(0, state.roundTimeLeft - SHARK_ATTACK_DAMAGE);
      state.shakeIntensity += 5.5;
      emitHitParticles(state.particles, fish.x, fish.y, fish.type, rng);
      state.floatingTexts.push({
        x: fish.x, y: fish.y - 28,
        vy: -52, text: `-${SHARK_ATTACK_DAMAGE}s`, life: 1.1, maxLife: 1.1,
      });
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
    const catchValue = Math.floor(
      getFishValue(fish.type, state.sessionTime, getValueMultiplier(state.upgrades), rng)
      * getHaulMultiplier(state.upgrades),
    );
    attachCatchToSpear(spear, fish.type, catchValue);
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
      continue;
    }

    state.money += totalReward;
    state.sessionEarnings += totalReward;
    state.sessionCatchCount += 1;

    // Pufferfish: add time + celebration flash
    if (catchResult.fishType === FishType.Puffer) {
      state.roundTimeLeft = Math.min(state.roundTimeMax, state.roundTimeLeft + PUFFER_TIME_BONUS);
      state.oxyBoostTimer = 1.8;
    }

    emitCatchPayoffFX(state.particles, catchResult.x, catchResult.y, catchResult.fishType, totalReward, rng);
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
}

export function update(state: FullGameState, dt: number, commands: GameInputCommand[]): void {
  switch (state.phase) {
    case GamePhase.Boat:
      updateBoat(state, commands);
      break;
    case GamePhase.Diving:
      updateDiving(state, dt);
      break;
    case GamePhase.Breaching:
      updateBreaching(state, dt);
      break;
    case GamePhase.Action:
      updateAction(state, dt, commands);
      break;
  }

  if (state.sharkBiteTeethElapsed >= 0) {
    state.sharkBiteTeethElapsed += dt;
    if (state.sharkBiteTeethElapsed >= SHARK_BITE_VFX_TOTAL_SEC) {
      state.sharkBiteTeethElapsed = -1;
    }
  }
}

function bubbleFadeInAlpha(b: { age: number }): number {
  return Math.min(1, b.age / OCEAN_BUBBLE_FADE_IN_SEC);
}

function getBreachBoatRevealAlpha(state: FullGameState): number {
  if (state.phase !== GamePhase.Breaching) return 0;
  const t = state.breachTimer;
  const F = OCEAN_TRANSITION_FADE_SEC;
  const M = OCEAN_TRANSITION_MOVE_SEC;
  const R = OCEAN_TRANSITION_BREACH_BOAT_REVEAL_SEC;
  if (t <= F + M) return 0;
  return smooth01((t - F - M) / R);
}

function buildTransitionBackdropAlphas(state: FullGameState): { boat: number; underwater: number } | null {
  if (state.phase === GamePhase.Diving) {
    const t = state.diveTimer;
    const P = OCEAN_TRANSITION_PREFACE_BEFORE_RISE_SEC;
    const M = OCEAN_TRANSITION_MOVE_SEC;
    if (t < P) {
      return { boat: smooth01(t / P), underwater: 0 };
    }
    if (t < P + M) {
      const rt = (t - P) / M;
      if (rt < 0.5) return { boat: 1, underwater: 0 };
      const u = smooth01((rt - 0.5) / 0.5);
      return { boat: 1 - u, underwater: u };
    }
    return { boat: 0, underwater: 1 };
  }
  if (state.phase === GamePhase.Breaching) {
    const t = state.breachTimer;
    const F = OCEAN_TRANSITION_FADE_SEC;
    const M = OCEAN_TRANSITION_MOVE_SEC;
    if (t > F + M) return null;
    if (t <= F) {
      return { boat: 0, underwater: 1 };
    }
    const mt = (t - F) / M;
    if (mt < 0.5) {
      return { boat: 0, underwater: 1 };
    }
    const u = smooth01((mt - 0.5) / 0.5);
    return { boat: u, underwater: 1 - u };
  }
  return null;
}

function buildOceanTransitionDraw(state: FullGameState): OceanTransitionDraw | null {
  if (state.phase !== GamePhase.Diving && state.phase !== GamePhase.Breaching) return null;

  const { surfaceDrawH, surfaceDrawW, scrollRange } = oceanSurfaceLayout();
  const { yStart, yEnd } = diveParentYEndpoints();
  const MOVE = OCEAN_TRANSITION_MOVE_SEC;
  const FADE = OCEAN_TRANSITION_FADE_SEC;
  const P = OCEAN_TRANSITION_PREFACE_BEFORE_RISE_SEC;

  let parentY: number;
  let surfaceScrollX: number;
  let groupAlpha: number;

  if (state.phase === GamePhase.Diving) {
    const t = state.diveTimer;
    if (t < P) {
      parentY = yStart;
      surfaceScrollX = 0;
      groupAlpha = 1;
    } else if (t <= P + MOVE) {
      const rt = (t - P) / MOVE;
      const u = smooth01(rt);
      parentY = yStart + (yEnd - yStart) * u;
      surfaceScrollX = -scrollRange * rt;
      groupAlpha = 1;
    } else {
      const uFade = (t - P - MOVE) / FADE;
      parentY = yEnd;
      surfaceScrollX = -scrollRange;
      groupAlpha = 1 - easeOutCubic(smooth01(uFade));
    }
  } else {
    const t = state.breachTimer;
    if (t > FADE + MOVE) return null;
    if (t <= FADE) {
      const uFade = t / FADE;
      parentY = yEnd;
      surfaceScrollX = -scrollRange;
      groupAlpha = easeOutCubic(smooth01(uFade));
    } else {
      const tm = t - FADE;
      const u = smooth01(tm / MOVE);
      parentY = yEnd + (yStart - yEnd) * u;
      surfaceScrollX = -scrollRange * (1 - u);
      groupAlpha = 1;
    }
  }

  const bubbles = state.oceanBubbles.map((b) => ({
    variant: b.variant,
    lx: b.lx,
    ly: b.ly,
    alpha: bubbleFadeInAlpha(b),
  }));

  return {
    parentY,
    surfaceScrollX,
    surfaceDrawH,
    surfaceDrawW,
    groupAlpha,
    bubbles,
  };
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
    ftueActive: ftue,
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
        const anchor = getTurretMuzzleWorld(state.player.x, state.player.y);
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
      };
    }),
    fish: state.fish
      .filter((current) => current.alive || current.hitFlash > 0)
      .map((current) => {
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
          && !current.hasAttacked;
        const attackProgress = isAggressive
          ? Math.min(1, (current.age - SHARK_AGGRO_DELAY) / SHARK_ATTACK_GROW_SEC)
          : 0;
        return {
          x: current.x,
          y: current.y,
          type: current.type,
          drawScale: current.drawScale,
          hitFlash: current.hitFlash,
          facingLeft: current.vx > 0,  // sprites face LEFT natively — flip when moving right
          rotation,
          isAggressive,
          attackProgress,
        };
      }),
    particles: [...state.particles],
    floatingTexts: [...state.floatingTexts],
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
    reloadFraction: state.player.shootCooldown > 0
      ? 1 - Math.min(1, state.player.shootCooldown / getShootCooldown(state.upgrades))
      : 1,
    comboCount: state.comboCount,
    comboActive: state.comboTimer > 0 && state.comboCount > 1,
    oxyBoostActive: state.oxyBoostTimer > 0,
    upgradePanelOpen: state.upgradePanelOpen,
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
    oceanTransition: buildOceanTransitionDraw(state),
    transitionBackdrop: buildTransitionBackdropAlphas(state),
    breachShowBoatRevealOnly:
      state.phase === GamePhase.Breaching
      && state.breachTimer >= OCEAN_TRANSITION_FADE_SEC + OCEAN_TRANSITION_MOVE_SEC,
    breachBoatRevealAlpha: getBreachBoatRevealAlpha(state),
    lastRunEarnings: state.lastRunEarnings,
    lastRunDurationSec: state.lastRunDurationSec,
    lastRunCatchCount: state.lastRunCatchCount,
    catchFlash: state.catchFlash,
    sharkBiteFlash: state.sharkBiteFlash,
    sharkBiteTeethElapsed: state.sharkBiteTeethElapsed,
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
        14,
        Math.max(5, 4 + Math.floor(Math.log2(tr.value + 8))),
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
