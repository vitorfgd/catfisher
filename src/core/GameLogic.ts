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
import type { RenderState } from '../render/RenderState';

import { Rng } from './Rng';
import {
  BAIT_COST,
  BAIT_DURATION,
  BAIT_MAX_STOCK,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DIVE_DURATION,
  HAUL_TREASURE_UNLOCK_LEVEL,
  NET_COST,
  NET_MAX_STOCK,
  PLAYER_X,
  PLAYER_Y,
  PUFFER_TIME_BONUS,
  SHAKE_COMBO_SCALE,
  SHAKE_DECAY,
  SHAKE_ON_CATCH,
  SHAKE_ON_HOOK,
  SHARK_AGGRO_DELAY,
  SHARK_ATTACK_DAMAGE,
  SHARK_ATTACK_RANGE,
  TREASURE_SPAWN_INTERVAL,
  UPGRADE_MAX_LEVEL,
  BOSS_SPAWN_INTERVAL,
  BOSS_SPAWN_MIN_TIME,
  WAVE_DURATION_SEC,
  BOSS_NET_DAMAGE,
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
  getSpawnInterval,
  removeDespawnedFish,
  spawnFish,
  spawnBossFish,
  spawnFishOfType,
  updateFish,
} from './FishSystem';
import {
  attachCatchToSpear,
  detectSpearFishCollisions,
  fireSpear,
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

const rng = new Rng();

export function createInitialState(): FullGameState {
  const upgrades: UpgradeState = { speargun: 1, haul: 1, oxygen: 1 };
  const consumables: ConsumableState = { net: 0, bait: 0 };

  return {
    phase: GamePhase.Boat,
    money: 0,
    upgrades,
    consumables,
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
    bossSpawnTimer: BOSS_SPAWN_INTERVAL,
    lastRunEarnings: 0,
    lastRunDurationSec: 0,
    lastRunCatchCount: 0,
    nextFishId: 1,
    nextSpearId: 1,
    fishSpawnTimer: 0,
    baitActive: false,
    baitTimer: 0,
    baitX: 0,
    baitY: 0,
    shakeIntensity: 0,
    shakeX: 0,
    shakeY: 0,
    catchFlash: 0,
    diveTimer: 0,
    pendingEvents: [],
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
  state.bossSpawnTimer = BOSS_SPAWN_INTERVAL;
  state.shakeIntensity = 0;
  state.shakeX = 0;
  state.shakeY = 0;
  state.catchFlash = 0;
}

function finishRun(state: FullGameState): void {
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

function updateDiving(state: FullGameState, dt: number): void {
  state.diveTimer += dt;
  if (state.diveTimer >= DIVE_DURATION) {
    state.diveTimer = DIVE_DURATION;
    state.phase = GamePhase.Action;
  }
}

function updateAction(state: FullGameState, dt: number, commands: GameInputCommand[]): void {
  if (state.catchFlash > 0) {
    state.catchFlash = Math.max(0, state.catchFlash - CATCH_FLASH_DECAY * dt);
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
      } else if (command.id === 'bait' && state.consumables.bait > 0) {
        state.consumables.bait -= 1;
        state.baitActive = true;
        state.baitTimer = BAIT_DURATION;
        // Drop bait at center of cave
        state.baitX = CANVAS_WIDTH / 2;
        state.baitY = CANVAS_HEIGHT * 0.38;
      }
      continue;
    }

    if (command.type !== 'tap') continue;

    const dx = command.x - state.player.x;
    const dy = command.y - state.player.y;
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
  state.roundTimeLeft = Math.max(0, state.roundTimeLeft - dt);

  state.fishSpawnTimer -= dt;
  if (state.fishSpawnTimer <= 0) {
    state.fish.push(spawnFish(state.nextFishId++, rng, state.sessionTime));
    state.fishSpawnTimer = getSpawnInterval(state.sessionTime);
  }

  // Treasure fish — spawned on a separate timer when haul >= unlock level
  if (state.upgrades.haul >= HAUL_TREASURE_UNLOCK_LEVEL) {
    state.treasureSpawnTimer -= dt;
    if (state.treasureSpawnTimer <= 0) {
      state.fish.push(spawnFishOfType(state.nextFishId++, rng, FishType.Treasure));
      state.treasureSpawnTimer = TREASURE_SPAWN_INTERVAL;
    }
  }

  // Rock boss — timer spawn, not in random table; at most one alive at a time
  if (state.sessionTime >= BOSS_SPAWN_MIN_TIME) {
    state.bossSpawnTimer -= dt;
    if (
      state.bossSpawnTimer <= 0 &&
      !state.fish.some((f) => f.type === FishType.Boss && f.alive)
    ) {
      state.fish.push(spawnBossFish(state.nextFishId++, rng));
      state.bossSpawnTimer = BOSS_SPAWN_INTERVAL;
    }
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
  for (const fish of state.fish) {
    if (fish.type !== FishType.Large || !fish.alive || fish.hasAttacked) continue;
    if (fish.age < SHARK_AGGRO_DELAY) continue;
    const dx = fish.x - PLAYER_X;
    const dy = fish.y - PLAYER_Y;
    if (Math.sqrt(dx * dx + dy * dy) < SHARK_ATTACK_RANGE) {
      fish.hasAttacked = true;
      fish.hitFlash = 1.0;
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
  // Subtle persistent shake while combo is alive — scales gently with streak
  if (state.comboTimer > 0 && state.comboCount > 1) {
    const comboFloor = Math.min(0.4 + state.comboCount * 0.15, 2.0);
    state.shakeIntensity = Math.max(state.shakeIntensity, comboFloor);
  }
  state.shakeX = state.shakeIntensity > 0 ? (rng.next() - 0.5) * state.shakeIntensity : 0;
  state.shakeY = state.shakeIntensity > 0 ? (rng.next() - 0.5) * state.shakeIntensity : 0;

  if (state.roundTimeLeft <= 0) {
    finishRun(state);
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
    case GamePhase.Action:
      updateAction(state, dt, commands);
      break;
  }
}

export function getRenderState(state: FullGameState): RenderState {
  const isDiving = state.phase === GamePhase.Diving;
  const diveAlpha = isDiving ? state.diveTimer / DIVE_DURATION : 1;
  const hasSpear = state.spears.length > 0;
  const carryingFish = state.spears.some((spear) => spear.caughtFishType !== null);
  const harpoonStatus = hasSpear
    ? (carryingFish ? 'HAUL' : 'REEL')
    : (state.player.shootCooldown <= 0 ? 'READY' : 'LOAD');

  return {
    phase: state.phase,
    shakeX: state.shakeX,
    shakeY: state.shakeY,
    player: {
      x: state.player.x,
      y: state.player.y,
      aimAngle: state.player.aimAngle,
    },
    spears: state.spears.map((spear) => ({
      x: spear.x,
      y: spear.y,
      angle: spear.fireAngle,   // never flips on return
      carryingFishType: spear.caughtFishType,
    })),
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
        return {
          x: current.x,
          y: current.y,
          type: current.type,
          hitFlash: current.hitFlash,
          facingLeft: current.vx > 0,  // sprites face LEFT natively — flip when moving right
          rotation,
          isAggressive: current.type === FishType.Large
            && current.alive
            && current.age >= SHARK_AGGRO_DELAY
            && !current.hasAttacked,
        };
      }),
    particles: [...state.particles],
    floatingTexts: [...state.floatingTexts],
    money: state.money,
    timeLeftFraction: state.roundTimeMax > 0 ? state.roundTimeLeft / state.roundTimeMax : 0,
    roundTimeLeft: state.roundTimeLeft,
    roundTimeMax: state.roundTimeMax,
    waveIndex: 1 + Math.floor(state.sessionTime / WAVE_DURATION_SEC),
    timeElapsed: state.sessionTime,
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
    diveAlpha,
    lastRunEarnings: state.lastRunEarnings,
    lastRunDurationSec: state.lastRunDurationSec,
    lastRunCatchCount: state.lastRunCatchCount,
    bossScreenTint: state.fish.some((f) => f.type === FishType.Boss && f.alive) ? 0.28 : 0,
    catchFlash: state.catchFlash,
  };
}

export function drainEvents(state: FullGameState): FullGameState['pendingEvents'] {
  return state.pendingEvents.splice(0);
}
